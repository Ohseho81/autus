"""
Tests for AUTUS Rules Engine
protocols/rules/engine.py
"""

import pytest
from pathlib import Path
from protocols.rules import RuleEngine
from protocols.rules.engine import get_rule_engine


class TestRuleEngine:
    """Tests for RuleEngine class."""
    
    @pytest.fixture
    def engine(self):
        """Create a fresh RuleEngine for each test."""
        engine = RuleEngine()
        yield engine
        engine.clear()
    
    def test_create_engine(self, engine):
        """Test creating a rule engine."""
        assert engine is not None
        assert engine.rules == {}
        assert engine.loaded_files == []
    
    def test_load_auth_scopes(self, engine):
        """Test loading auth_scopes.yaml."""
        rules = engine.load_rules("rules/auth_scopes.yaml")
        
        assert len(rules) > 0
        assert "rules/auth_scopes.yaml" in engine.loaded_files
    
    def test_load_view_scope(self, engine):
        """Test loading view_scope.yaml."""
        rules = engine.load_rules("rules/view_scope.yaml")
        
        assert len(rules) > 0
        assert any(r.get("id") == "R_VIEW_STUDENT" for r in rules)
    
    def test_load_nonexistent_file(self, engine):
        """Test loading a file that doesn't exist."""
        with pytest.raises(FileNotFoundError):
            engine.load_rules("rules/nonexistent.yaml")
    
    def test_match_student_role(self, engine):
        """Test matching grants for student role."""
        rules = engine.load_rules("rules/auth_scopes.yaml")
        grants = engine.match("student", rules)
        
        assert "twin:read_me" in grants
        assert "memory:read_me" in grants
        assert len(grants) > 0
    
    def test_match_teacher_role(self, engine):
        """Test matching grants for teacher role."""
        rules = engine.load_rules("rules/auth_scopes.yaml")
        grants = engine.match("teacher", rules)
        
        assert "twin:read_class" in grants
        assert "grades:write_class" in grants
    
    def test_match_seho_god_mode(self, engine):
        """Test that seho gets god mode (wildcard)."""
        rules = engine.load_rules("rules/auth_scopes.yaml")
        grants = engine.match("seho", rules)
        
        assert "*" in grants
    
    def test_evaluate_view_student(self, engine):
        """Test evaluating view scope for student."""
        rules = engine.load_rules("rules/view_scope.yaml")
        view = engine.evaluate_view("student", rules)
        
        assert "self.tasks" in view["include"]
        assert "self.schedule" in view["include"]
        assert "admin.*" in view["exclude"]
    
    def test_evaluate_view_seho(self, engine):
        """Test evaluating view scope for seho (god mode)."""
        rules = engine.load_rules("rules/view_scope.yaml")
        view = engine.evaluate_view("seho", rules)
        
        assert "*" in view["include"]
        assert view["exclude"] == []
    
    def test_check_permission_allowed(self, engine):
        """Test checking a permitted permission."""
        rules = engine.load_rules("rules/auth_scopes.yaml")
        
        assert engine.check_permission("student", "twin:read_me", rules) is True
        assert engine.check_permission("teacher", "grades:write_class", rules) is True
    
    def test_check_permission_denied(self, engine):
        """Test checking a denied permission."""
        rules = engine.load_rules("rules/auth_scopes.yaml")
        
        # Student shouldn't have admin permissions
        assert engine.check_permission("student", "admin:delete_all", rules) is False
    
    def test_check_permission_god_mode(self, engine):
        """Test that god mode (seho) has all permissions."""
        rules = engine.load_rules("rules/auth_scopes.yaml")
        
        assert engine.check_permission("seho", "anything:at_all", rules) is True
        assert engine.check_permission("seho", "admin:nuclear_launch", rules) is True
    
    def test_clear_rules(self, engine):
        """Test clearing all rules."""
        engine.load_rules("rules/auth_scopes.yaml")
        assert len(engine.rules) > 0
        
        engine.clear()
        assert engine.rules == {}
        assert engine.loaded_files == []
    
    def test_get_all_rules(self, engine):
        """Test getting all loaded rules."""
        engine.load_rules("rules/auth_scopes.yaml")
        engine.load_rules("rules/view_scope.yaml")
        
        all_rules = engine.get_all_rules()
        assert len(all_rules) == 2


class TestRuleEngineSingleton:
    """Tests for the singleton pattern."""
    
    def test_get_rule_engine(self):
        """Test getting the singleton engine."""
        engine1 = get_rule_engine()
        engine2 = get_rule_engine()
        
        assert engine1 is engine2


