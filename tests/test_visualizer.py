import pytest
from protocols.identity.visualizer import Identity3DGenerator, SurfaceEvolution, generate_demo_data

class TestIdentity3D:
    def test_position(self):
        pos = Identity3DGenerator().get_position()
        assert len(pos) == 3 and all(-1 <= p <= 1 for p in pos)
    
    def test_color(self):
        c = Identity3DGenerator().get_color()
        assert c["primary"].startswith("#")
    
    def test_shape(self):
        s = Identity3DGenerator().get_shape()
        assert s["geometry"] in Identity3DGenerator.GEOMETRIES

class TestSurface:
    def test_pattern(self):
        surf = SurfaceEvolution()
        surf.record_pattern("test")
        assert len(surf.patterns) == 1

class TestDemo:
    def test_data(self):
        d = generate_demo_data()
        assert "core" in d and "surface" in d
