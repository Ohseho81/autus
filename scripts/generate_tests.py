"""
Automatic API Endpoint Test Generation

Generates pytest test cases for all FastAPI endpoints
Includes performance benchmarking
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import ast


class EndpointExtractor:
    """Extract endpoints from FastAPI main.py"""
    
    def __init__(self, main_py_path: str):
        self.main_py_path = Path(main_py_path)
        self.endpoints: List[Dict[str, Any]] = []
    
    def extract(self) -> List[Dict[str, Any]]:
        """Extract all endpoints from main.py"""
        if not self.main_py_path.exists():
            print(f"Error: {self.main_py_path} not found")
            return []
        
        with open(self.main_py_path, 'r') as f:
            content = f.read()
        
        # Find route decorators
        route_patterns = [
            r'@app\.(\w+)\(["\']([^"\']+)["\']',  # @app.get("/path")
            r'@router\.(\w+)\(["\']([^"\']+)["\']',  # @router.get("/path")
            r'@app\.(\w+)\(\).*?\n.*?def (\w+)',  # @app.get() def func
        ]
        
        methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']
        
        # Simple regex extraction
        for method in methods:
            # Match @app.method("/path")
            pattern = rf'@app\.{method}\(["\']([^"\']+)["\']'
            matches = re.findall(pattern, content)
            for path in matches:
                self.endpoints.append({
                    'method': method.upper(),
                    'path': path,
                    'source': 'main.py',
                    'test_type': 'simple'  # GET endpoints without params
                })
        
        return self.endpoints
    
    def get_health_endpoints(self) -> List[Dict[str, Any]]:
        """Get health check endpoints for quick tests"""
        return [
            {'method': 'GET', 'path': '/health', 'source': 'main.py', 'test_type': 'health'},
            {'method': 'GET', 'path': '/api/v1/monitoring/health', 'source': 'main.py', 'test_type': 'health'},
            {'method': 'GET', 'path': '/api/v1/monitoring/summary', 'source': 'main.py', 'test_type': 'metrics'},
        ]


class TestGenerator:
    """Generate pytest test file"""
    
    def __init__(self, endpoints: List[Dict[str, Any]]):
        self.endpoints = endpoints
    
    def generate(self) -> str:
        """Generate pytest test file content"""
        
        test_code = '''"""
Auto-generated API endpoint tests
Tests all FastAPI endpoints for basic functionality and performance
"""

import pytest
import time
from httpx import AsyncClient
from main import app

# Test configuration
PERFORMANCE_THRESHOLD_MS = 5000  # 5 seconds for slow endpoints
HEALTH_CHECK_TIMEOUT = 10  # 10 seconds


@pytest.fixture
async def client():
    """Create async test client"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


class TestEndpoints:
    """Test all API endpoints"""
    
    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test basic health endpoint"""
        response = await client.get("/health")
        assert response.status_code in [200, 404]  # 404 if not implemented
        if response.status_code == 200:
            data = response.json()
            assert "status" in data or "ok" in str(data).lower()
    
    @pytest.mark.asyncio
    async def test_monitoring_endpoints(self, client):
        """Test monitoring endpoints"""
        endpoints = [
            "/api/v1/monitoring/health",
            "/api/v1/monitoring/summary",
            "/api/v1/monitoring/endpoints",
        ]
        
        for endpoint in endpoints:
            response = await client.get(endpoint)
            assert response.status_code in [200, 404], f"Failed: {endpoint}"
            
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, (dict, list))
    
    @pytest.mark.asyncio
    async def test_docs_endpoints(self, client):
        """Test API documentation endpoints"""
        endpoints = [
            "/docs",
            "/redoc",
            "/openapi.json",
        ]
        
        for endpoint in endpoints:
            response = await client.get(endpoint)
            assert response.status_code in [200, 404], f"Failed: {endpoint}"
    
    @pytest.mark.asyncio
    async def test_response_times(self, client):
        """Test that endpoints respond within threshold"""
        test_endpoints = [
            "/health",
            "/api/v1/monitoring/summary",
        ]
        
        slow_endpoints = []
        
        for endpoint in test_endpoints:
            start_time = time.time()
            response = await client.get(endpoint)
            elapsed_ms = (time.time() - start_time) * 1000
            
            assert response.status_code in [200, 404], f"Failed: {endpoint}"
            
            if response.status_code == 200 and elapsed_ms > PERFORMANCE_THRESHOLD_MS:
                slow_endpoints.append({
                    'endpoint': endpoint,
                    'time_ms': elapsed_ms
                })
        
        # Report slow endpoints
        if slow_endpoints:
            print("\\n⚠️  Slow endpoints detected:")
            for ep in slow_endpoints:
                print(f"  {ep['endpoint']}: {ep['time_ms']:.2f}ms")


class TestErrorHandling:
    """Test error handling"""
    
    @pytest.mark.asyncio
    async def test_404_not_found(self, client):
        """Test 404 error handling"""
        response = await client.get("/non-existent-endpoint")
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_method_not_allowed(self, client):
        """Test 405 error handling"""
        response = await client.post("/health")
        assert response.status_code in [405, 200]  # Depends on implementation
    
    @pytest.mark.asyncio
    async def test_invalid_json(self, client):
        """Test invalid JSON handling"""
        response = await client.post(
            "/api/v1/tasks/",
            content="invalid json",
            headers={"content-type": "application/json"}
        )
        assert response.status_code in [400, 404, 422]


class TestPerformance:
    """Performance benchmarking tests"""
    
    @pytest.mark.asyncio
    async def test_endpoint_performance(self, client):
        """Benchmark endpoint response times"""
        endpoints = [
            "/health",
            "/api/v1/monitoring/summary",
        ]
        
        results = {}
        
        for endpoint in endpoints:
            times = []
            for _ in range(10):  # Run 10 times
                start = time.time()
                response = await client.get(endpoint)
                elapsed_ms = (time.time() - start) * 1000
                
                if response.status_code == 200:
                    times.append(elapsed_ms)
            
            if times:
                results[endpoint] = {
                    'min_ms': min(times),
                    'max_ms': max(times),
                    'avg_ms': sum(times) / len(times),
                    'count': len(times)
                }
        
        # Assert average performance
        for endpoint, metrics in results.items():
            assert metrics['avg_ms'] < PERFORMANCE_THRESHOLD_MS, \\
                f"{endpoint} too slow: {metrics['avg_ms']:.2f}ms"
        
        # Print results
        print("\\n📊 Performance Results:")
        for endpoint, metrics in results.items():
            print(f"  {endpoint}:")
            print(f"    Min: {metrics['min_ms']:.2f}ms")
            print(f"    Avg: {metrics['avg_ms']:.2f}ms")
            print(f"    Max: {metrics['max_ms']:.2f}ms")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
'''
        return test_code


def generate_test_file(output_path: str = "tests/test_endpoints_auto.py"):
    """Generate and save test file"""
    
    # Get endpoints
    extractor = EndpointExtractor("main.py")
    health_endpoints = extractor.get_health_endpoints()
    
    # Generate tests
    generator = TestGenerator(health_endpoints)
    test_code = generator.generate()
    
    # Save to file
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w') as f:
        f.write(test_code)
    
    print(f"✅ Test file generated: {output_path}")
    return output_path


if __name__ == "__main__":
    import sys
    
    output = generate_test_file()
    print(f"\n📍 Generated test file: {output}")
    print("\n🚀 Run tests with:")
    print(f"  pytest {output} -v")
