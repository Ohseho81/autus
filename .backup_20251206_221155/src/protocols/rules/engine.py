"""
AUTUS Rule Engine
Evaluates view scopes and auth permissions based on YAML rules
"""

import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional


class RuleEngine:
    """
    Rule Engine for evaluating access control rules.
    
    Loads rules from YAML files and evaluates them against user context.
    """
    
    def __init__(self):
        self.rules: Dict[str, List[Dict]] = {}
        self.loaded_files: List[str] = []
    
    def load_rules(self, path: str) -> List[Dict]:
        """
        Load rules from a YAML file.
        
        Args:
            path: Path to YAML file
            
        Returns:
            List of rule dictionaries
        """
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"Rules file not found: {path}")
        
        with open(file_path) as f:
            data = yaml.safe_load(f)
        
        rules = data.get("rules", [])
        self.rules[path] = rules
        self.loaded_files.append(path)
        
        return rules
    
    def match(self, role: str, rules: List[Dict]) -> List[str]:
        """
        Match a role against rules and return granted permissions.
        
        Args:
            role: User role (student, teacher, etc.)
            rules: List of rule dictionaries
            
        Returns:
            List of granted permissions/scopes
        """
        grants = []
        
        for rule in rules:
            # Check direct role match
            if rule.get("role") == role:
                grants.extend(rule.get("grants", []))
                grants.extend(rule.get("include", []))
            
            # Check 'when' condition
            when = rule.get("when", "")
            if f"'{role}'" in when:
                grants.extend(rule.get("grants", []))
                grants.extend(rule.get("include", []))
        
        # Handle wildcard (god mode)
        if "*" in grants:
            return ["*"]
        
        return list(set(grants))  # Remove duplicates
    
    def evaluate_view(self, role: str, view_rules: List[Dict]) -> Dict[str, List[str]]:
        """
        Evaluate view scope rules for a role.
        
        Args:
            role: User role
            view_rules: List of view scope rules
            
        Returns:
            Dict with 'include' and 'exclude' lists
        """
        for rule in view_rules:
            when = rule.get("when", "")
            if f"'{role}'" in when:
                return {
                    "include": rule.get("include", []),
                    "exclude": rule.get("exclude", [])
                }
        
        return {"include": [], "exclude": []}
    
    def check_permission(self, role: str, permission: str, rules: List[Dict]) -> bool:
        """
        Check if a role has a specific permission.
        
        Args:
            role: User role
            permission: Permission to check (e.g., 'twin:read_me')
            rules: List of auth rules
            
        Returns:
            True if permitted, False otherwise
        """
        grants = self.match(role, rules)
        
        # God mode has all permissions
        if "*" in grants:
            return True
        
        # Check exact match
        if permission in grants:
            return True
        
        # Check prefix match (e.g., 'twin:*' grants 'twin:read_me')
        for grant in grants:
            if grant.endswith(":*"):
                prefix = grant[:-1]  # Remove '*'
                if permission.startswith(prefix):
                    return True
        
        return False
    
    def get_all_rules(self) -> Dict[str, List[Dict]]:
        """Get all loaded rules."""
        return self.rules
    
    def clear(self):
        """Clear all loaded rules."""
        self.rules = {}
        self.loaded_files = []


# Singleton instance
_engine: Optional[RuleEngine] = None


def get_rule_engine() -> RuleEngine:
    """Get or create the rule engine singleton."""
    global _engine
    if _engine is None:
        _engine = RuleEngine()
    return _engine

