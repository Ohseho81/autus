"""활성 시스템 관리"""
ACTIVE_SYSTEMS = {
    "brain": True,
    "logic": True,
    "memory": True,
    "governance": True,
    "sensors": False,
    "executor": False,
}

def systems_count() -> int:
    return sum(1 for v in ACTIVE_SYSTEMS.values() if v)

def activate_system(name: str):
    if name in ACTIVE_SYSTEMS:
        ACTIVE_SYSTEMS[name] = True

def deactivate_system(name: str):
    if name in ACTIVE_SYSTEMS:
        ACTIVE_SYSTEMS[name] = False

def list_systems() -> dict:
    return ACTIVE_SYSTEMS.copy()
