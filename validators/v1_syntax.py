import yaml
import json
from typing import List, Tuple

def validate_syntax(file_path: str) -> Tuple[bool, List[str]]:
    errors = []
    try:
        with open(file_path, 'r') as f:
            if file_path.endswith('.yaml') or file_path.endswith('.yml'):
                yaml.safe_load(f)
            elif file_path.endswith('.json'):
                json.load(f)
        return True, []
    except Exception as e:
        errors.append(f"SYNTAX_ERROR in {file_path}: {str(e)}")
        return False, errors
