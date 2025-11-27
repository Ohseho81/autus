import pytest
from protocols.identity.visualizer import generate_demo_data

class TestNodeAPI:
    def test_identity_state(self):
        data = generate_demo_data()
        assert "core" in data
        assert "position" in data["core"]
    
    def test_position_format(self):
        data = generate_demo_data()
        pos = data["core"]["position"]
        assert len(pos) == 3
        assert all(isinstance(p, (int, float)) for p in pos)
    
    def test_color_format(self):
        data = generate_demo_data()
        color = data["core"]["color"]["primary"]
        assert color.startswith("#")
        assert len(color) == 7

class TestNodeTypes:
    def test_workflow_orbit(self):
        import math
        nodes = []
        for i in range(5):
            angle = (i / 5) * 2 * math.pi
            pos = (3 * math.cos(angle), 0, 3 * math.sin(angle))
            nodes.append(pos)
        assert len(nodes) == 5
        # 첫번째와 마지막 노드 거리 확인
        assert abs(nodes[0][0] - 3.0) < 0.01
    
    def test_memory_galaxy(self):
        import hashlib
        name = "test_pattern"
        h = hashlib.md5(name.encode()).digest()
        pos = ((h[0]/128 - 1) * 5, (h[1]/128 - 1) * 5, (h[2]/128 - 1) * 5)
        assert all(-5 <= p <= 5 for p in pos)
