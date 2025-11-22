"""
.autus 파일 파서
"""
import yaml
from pathlib import Path
from datetime import datetime

def parse(path=".autus"):
    """
    .autus 파일 파싱
    
    Returns:
        dict: 설정
    """
    if not Path(path).exists():
        raise FileNotFoundError(f".autus 파일 없음: {path}")
    
    with open(path) as f:
        config = yaml.safe_load(f)
    
    # 검증
    required = ["version", "project"]
    for key in required:
        if key not in config:
            raise ValueError(f"필수 필드 없음: {key}")
    
    return config

def create(project_name: str, cells: dict = None):
    """
    .autus 파일 생성
    """
    config = {
        "version": "1.0.0",
        "project": project_name,
        "cells": cells or {},
        "chain": "",
        "context": {},
        "memory": {
            "user": "default",
            "path": "07_memory/personal/default"
        }
    }
    
    with open(".autus", "w") as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
    
    print(f"✅ .autus 생성: {project_name}")
    return config

def list_cells(config: dict):
    """Cell 목록 출력"""
    cells = config.get("cells", {})
    
    if not cells:
        print("  (Cell 없음)")
        return
    
    for name, command in cells.items():
        print(f"  - {name}: {command}")

# 테스트
if __name__ == "__main__":
    print("🧪 Autusfile 테스트\n")
    
    # 생성
    create("test_project", {
        "weather": "GET api.weather.com/$city",
        "github": "GET api.github.com/users/$user"
    })
    
    # 파싱
    config = parse()
    print(f"\n✅ 파싱 성공:")
    print(f"  프로젝트: {config['project']}")
    print(f"  버전: {config['version']}")
    print(f"  Cells:")
    list_cells(config)
