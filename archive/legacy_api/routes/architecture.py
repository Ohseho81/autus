"""
Architecture Analysis & Visualization API
==========================================

VS Code Integration: Real-time dependency analysis, impact assessment, and architecture visualization

Endpoints:
  GET /api/v1/architecture/graph - Module dependency DAG (JSON)
  GET /api/v1/architecture/graph/svg - SVG visualization
  GET /api/v1/architecture/impact - Code change impact analysis
  GET /api/v1/architecture/modules - All modules with dependencies
  GET /api/v1/architecture/hotspots - Complexity hotspots
  GET /api/v1/architecture/health - Architecture quality metrics
  GET /api/v1/architecture/vs-code - VS Code extension data
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Set, Optional, Any
import ast
import re
from pathlib import Path
from collections import defaultdict, deque
from datetime import datetime

router = APIRouter(prefix="/architecture", tags=["Architecture"])

# ============================================================
# DEPENDENCY ANALYSIS ENGINE
# ============================================================

class DependencyAnalyzer:
    """Analyze Python module dependencies and create DAG"""
    
    def __init__(self, root_path: str = "/Users/oseho/Desktop/autus"):
        self.root = Path(root_path)
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.imports: Dict[str, List[str]] = defaultdict(list)
        self.complexity: Dict[str, int] = {}
        self.endpoints: Dict[str, List[str]] = defaultdict(list)
        self.last_updated = datetime.now()
        
    def analyze_file(self, filepath: Path) -> Dict[str, Any]:
        """Analyze single Python file"""
        if not filepath.exists() or filepath.suffix != '.py':
            return {}
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            # Extract imports
            imports = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.append(alias.name.split('.')[0])
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports.append(node.module.split('.')[0])
            
            # Count complexity (functions, classes, lines)
            functions = len([n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)])
            classes = len([n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)])
            complexity = functions + classes * 2
            
            # Extract endpoints
            endpoints = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Decorator):
                    if hasattr(node, 'id') and 'router' in str(node.id):
                        endpoints.append(str(node.id))
            
            # Extract @router.get/post/put/delete patterns
            router_pattern = r'@router\.(get|post|put|delete|patch|head|options)\(["\']([^"\']+)["\']'
            endpoints.extend(re.findall(router_pattern, content))
            
            return {
                'imports': list(set(imports)),
                'complexity': complexity,
                'functions': functions,
                'classes': classes,
                'lines': len(content.split('\n')),
                'endpoints': endpoints
            }
        except Exception as e:
            return {'error': str(e)}
    
    def analyze_all(self) -> None:
        """Analyze entire codebase"""
        python_files = list(self.root.rglob('*.py'))
        
        for filepath in python_files:
            # Skip venv and cache
            if '.venv' in str(filepath) or '__pycache__' in str(filepath):
                continue
            
            rel_path = str(filepath.relative_to(self.root))
            module_name = rel_path.replace('/', '.').replace('.py', '')
            
            analysis = self.analyze_file(filepath)
            
            if analysis:
                self.imports[module_name] = analysis.get('imports', [])
                self.complexity[module_name] = analysis.get('complexity', 0)
                self.endpoints[module_name] = analysis.get('endpoints', [])
                
                # Build dependency graph
                for imp in analysis.get('imports', []):
                    if imp not in ['sys', 'os', 'json', 're', 'typing', 'datetime', 'asyncio']:
                        self.dependencies[module_name].add(imp)
    
    def get_impact(self, module_name: str) -> Dict[str, Any]:
        """Get impact of changes in a module"""
        impact_set: Set[str] = set()
        visited: Set[str] = set()
        queue = deque([module_name])
        
        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            
            # Find modules that depend on current
            for mod, deps in self.dependencies.items():
                if current in deps:
                    impact_set.add(mod)
                    queue.append(mod)
        
        return {
            'changed_module': module_name,
            'directly_affected': list(self.dependencies.get(module_name, [])),
            'transitively_affected': list(impact_set - {module_name}),
            'total_affected': len(impact_set),
            'risk_level': 'HIGH' if len(impact_set) > 10 else 'MEDIUM' if len(impact_set) > 5 else 'LOW'
        }


analyzer = DependencyAnalyzer()


# ============================================================
# GRAPH VISUALIZATION
# ============================================================

def generate_svg_graph(dependencies: Dict[str, Set[str]], max_nodes: int = 50) -> str:
    """Generate SVG dependency graph"""
    
    # Simplify for large graphs
    nodes = list(dependencies.keys())[:max_nodes]
    
    # Calculate positions (simple layout)
    positions = {}
    for i, node in enumerate(nodes):
        angle = (i / len(nodes)) * 2 * 3.14159
        x = 400 + 300 * (angle ** 0.5) * (i % 10)
        y = 300 + 300 * (i // 10)
        positions[node] = (x, y)
    
    # Create SVG
    svg = ['<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">']
    svg.append('<style>text { font-family: monospace; font-size: 10px; } line { stroke: #ccc; } circle { fill: #0066cc; } circle.high { fill: #ff3333; } circle.med { fill: #ff9900; }</style>')
    
    # Draw edges
    for source, targets in dependencies.items():
        if source not in positions:
            continue
        sx, sy = positions[source]
        for target in targets:
            if target in positions:
                tx, ty = positions[target]
                svg.append(f'<line x1="{sx}" y1="{sy}" x2="{tx}" y2="{ty}" stroke="#999" opacity="0.5"/>')
    
    # Draw nodes
    for node in nodes:
        if node in positions:
            x, y = positions[node]
            complexity = analyzer.complexity.get(node, 0)
            color_class = 'high' if complexity > 20 else 'med' if complexity > 10 else ''
            svg.append(f'<circle cx="{x}" cy="{y}" r="15" class="{color_class}"/>')
            svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" dy=".3em" fill="white">{node[:8]}</text>')
    
    svg.append('</svg>')
    return '\n'.join(svg)


# ============================================================
# API ENDPOINTS
# ============================================================

@router.get("/graph")
async def get_dependency_graph() -> Dict[str, Any]:
    """Get complete dependency DAG as JSON"""
    if not analyzer.dependencies:
        analyzer.analyze_all()
    
    # Convert sets to lists
    graph = {module: list(deps) for module, deps in analyzer.dependencies.items()}
    
    return {
        'timestamp': datetime.now().isoformat(),
        'total_modules': len(graph),
        'graph': graph,
        'complexity_distribution': {
            'high': len([c for c in analyzer.complexity.values() if c > 20]),
            'medium': len([c for c in analyzer.complexity.values() if 10 <= c <= 20]),
            'low': len([c for c in analyzer.complexity.values() if c < 10])
        }
    }


@router.get("/graph/svg")
async def get_graph_svg() -> str:
    """Get dependency graph as SVG"""
    if not analyzer.dependencies:
        analyzer.analyze_all()
    
    svg = generate_svg_graph(analyzer.dependencies)
    return svg


@router.get("/modules")
async def get_modules(
    sort_by: str = Query(default="complexity", description="Sort by: complexity, endpoints, lines"),
    limit: int = Query(default=50, le=100)
) -> Dict[str, Any]:
    """Get all modules with their metrics"""
    if not analyzer.dependencies:
        analyzer.analyze_all()
    
    modules = []
    for module_name, deps in analyzer.dependencies.items():
        modules.append({
            'name': module_name,
            'complexity': analyzer.complexity.get(module_name, 0),
            'dependencies_count': len(deps),
            'endpoints_count': len(analyzer.endpoints.get(module_name, [])),
            'imports': analyzer.imports.get(module_name, [])[:10],  # Top 10
            'is_high_complexity': analyzer.complexity.get(module_name, 0) > 20
        })
    
    # Sort
    if sort_by == 'complexity':
        modules.sort(key=lambda x: x['complexity'], reverse=True)
    elif sort_by == 'endpoints':
        modules.sort(key=lambda x: x['endpoints_count'], reverse=True)
    elif sort_by == 'lines':
        modules.sort(key=lambda x: x['dependencies_count'], reverse=True)
    
    return {
        'total': len(modules),
        'modules': modules[:limit]
    }


@router.get("/hotspots")
async def get_complexity_hotspots() -> Dict[str, Any]:
    """Get high-complexity modules (refactoring targets)"""
    if not analyzer.dependencies:
        analyzer.analyze_all()
    
    hotspots = [
        {
            'module': module,
            'complexity': complexity,
            'dependencies': len(analyzer.dependencies.get(module, [])),
            'endpoints': len(analyzer.endpoints.get(module, [])),
            'reason': 'Too many dependencies' if len(analyzer.dependencies.get(module, [])) > 10 else 'High complexity'
        }
        for module, complexity in analyzer.complexity.items()
        if complexity > 20 or len(analyzer.dependencies.get(module, [])) > 10
    ]
    
    hotspots.sort(key=lambda x: x['complexity'], reverse=True)
    
    return {
        'total_hotspots': len(hotspots),
        'hotspots': hotspots[:20]
    }


@router.get("/impact")
async def get_change_impact(
    module: str = Query(..., description="Module name to check impact")
) -> Dict[str, Any]:
    """Analyze impact of changes in a module"""
    if not analyzer.dependencies:
        analyzer.analyze_all()
    
    return analyzer.get_impact(module)


@router.get("/health")
async def get_architecture_health() -> Dict[str, Any]:
    """Get architecture quality metrics"""
    if not analyzer.dependencies:
        analyzer.analyze_all()
    
    total_modules = len(analyzer.dependencies)
    avg_complexity = sum(analyzer.complexity.values()) / len(analyzer.complexity) if analyzer.complexity else 0
    avg_deps = sum(len(deps) for deps in analyzer.dependencies.values()) / total_modules if total_modules > 0 else 0
    
    # Calculate metrics
    high_complexity_modules = len([c for c in analyzer.complexity.values() if c > 20])
    high_dep_modules = len([deps for deps in analyzer.dependencies.values() if len(deps) > 10])
    
    health_score = 100
    if high_complexity_modules > 5:
        health_score -= 10
    if high_dep_modules > 5:
        health_score -= 10
    if avg_deps > 8:
        health_score -= 10
    
    return {
        'health_score': max(0, health_score),
        'total_modules': total_modules,
        'average_complexity': round(avg_complexity, 2),
        'average_dependencies': round(avg_deps, 2),
        'high_complexity_modules': high_complexity_modules,
        'high_dependency_modules': high_dep_modules,
        'recommendations': [
            'Reduce module complexity in high-complexity modules' if high_complexity_modules > 5 else None,
            'Break down modules with many dependencies' if high_dep_modules > 5 else None,
            'Consider architectural refactoring' if health_score < 50 else None
        ]
    }


@router.get("/vs-code")
async def get_vscode_data() -> Dict[str, Any]:
    """Get data optimized for VS Code IDE integration"""
    if not analyzer.dependencies:
        analyzer.analyze_all()
    
    return {
        'timestamp': datetime.now().isoformat(),
        'breadcrumb': {
            'graph': 'dependency_dag.json',
            'hotspots': f'found {len([c for c in analyzer.complexity.values() if c > 20])} hotspots',
            'endpoints': f'{sum(len(e) for e in analyzer.endpoints.values())} total'
        },
        'gutter_icons': {
            'high_complexity': [m for m in analyzer.complexity if analyzer.complexity[m] > 20],
            'high_deps': [m for m, d in analyzer.dependencies.items() if len(d) > 10]
        },
        'quick_pick': [
            {'label': '📊 Architecture Graph', 'command': 'autus.showArchitecture'},
            {'label': '🔴 Complexity Hotspots', 'command': 'autus.showHotspots'},
            {'label': '⚡ Impact Analysis', 'command': 'autus.showImpact'},
            {'label': '❤️ Architecture Health', 'command': 'autus.showHealth'}
        ],
        'explorer_decorations': {
            'high_complexity': {
                'color': 'problemsWarningForeground',
                'icon': '⚠️'
            },
            'high_deps': {
                'color': 'problemsErrorForeground',
                'icon': '🔴'
            }
        }
    }
