#!/usr/bin/env python3
"""
AUTUS-PM: Project Manager CLI
- 세션 시작/종료 관리
- 슬롯 상태 자동 업데이트
- 다음 행동 지시
"""

import json
import yaml
import os
from datetime import datetime
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent
DEV_DIR = BASE_DIR / "dev"
SLOTS_DIR = BASE_DIR / "slots"
STATE_FILE = DEV_DIR / "state.json"
SLOT_MAP_FILE = BASE_DIR / "slot_map.yaml"
TODAY_FILE = DEV_DIR / "today.md"

def load_state():
    """현재 세션 상태 로드"""
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "current_slot": None,
        "current_goal": None,
        "session_status": "NEW",
        "last_updated": None,
        "next_candidate_slots": [],
        "blockers": []
    }

def save_state(state):
    """세션 상태 저장"""
    state["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))

def load_slot_map():
    """슬롯맵 로드"""
    if SLOT_MAP_FILE.exists():
        return yaml.safe_load(SLOT_MAP_FILE.read_text())
    return {"slots": {}}

def save_slot_map(slot_map):
    """슬롯맵 저장"""
    SLOT_MAP_FILE.write_text(yaml.dump(slot_map, allow_unicode=True, default_flow_style=False))

def get_slot_stats(slot_map):
    """슬롯 통계 계산"""
    stats = {"FILLED": 0, "PARTIAL": 0, "OFF": 0, "total": 0}
    partial_slots = []
    
    for layer, slots in slot_map.get("slots", {}).items():
        for slot_name, slot_data in slots.items():
            stats["total"] += 1
            status = slot_data.get("status", "PARTIAL")
            if status == "FILLED":
                stats["FILLED"] += 1
            elif status == "OFF":
                stats["OFF"] += 1
            else:
                stats["PARTIAL"] += 1
                partial_slots.append(f"{layer}/{slot_name}")
    
    return stats, partial_slots

def print_header():
    """헤더 출력"""
    print("\n" + "━" * 50)
    print("  [AUTUS-PM] Project Manager")
    print("━" * 50)

def cmd_start():
    """세션 시작"""
    print_header()
    
    state = load_state()
    slot_map = load_slot_map()
    stats, partial_slots = get_slot_stats(slot_map)
    
    print(f"\n📍 Current Slot: {state.get('current_slot', 'None')}")
    print(f"🎯 Goal: {state.get('current_goal', 'None')}")
    print(f"🚧 Blockers: {state.get('blockers') or 'None'}")
    
    print(f"\n📊 Progress: {stats['FILLED']}/{stats['total']} FILLED ({int(stats['FILLED']/stats['total']*100)}%)")
    print(f"   - FILLED: {stats['FILLED']}")
    print(f"   - PARTIAL: {stats['PARTIAL']}")
    print(f"   - OFF: {stats['OFF']}")
    
    if partial_slots:
        print(f"\n⏳ Pending Slots:")
        for slot in partial_slots[:5]:
            print(f"   - {slot}")
    
    # 다음 행동 제안
    print("\n" + "─" * 50)
    print("📋 Next Actions:")
    
    if state.get("current_slot"):
        slot_path = state["current_slot"]
        layer, name = slot_path.split("/")
        slot_data = slot_map.get("slots", {}).get(layer, {}).get(name, {})
        print(f"   1. Continue: {slot_path}")
        print(f"      Done condition: {slot_data.get('done', 'N/A')}")
    
    if partial_slots:
        next_slot = partial_slots[0] if partial_slots[0] != state.get("current_slot") else (partial_slots[1] if len(partial_slots) > 1 else None)
        if next_slot:
            print(f"   2. Switch to: {next_slot}")
    
    print("\n" + "─" * 50)
    print("💡 Commands:")
    print("   python scripts/autus_pm.py start    # 세션 시작")
    print("   python scripts/autus_pm.py focus <slot>  # 슬롯 집중")
    print("   python scripts/autus_pm.py done <slot>   # 슬롯 완료")
    print("   python scripts/autus_pm.py end      # 세션 종료")
    print("━" * 50 + "\n")
    
    # 상태 업데이트
    state["session_status"] = "IN_PROGRESS"
    save_state(state)

def cmd_focus(slot_path):
    """특정 슬롯에 집중"""
    print_header()
    
    state = load_state()
    slot_map = load_slot_map()
    
    # 슬롯 경로 파싱
    if "/" not in slot_path:
        # layer 없이 이름만 제공된 경우 검색
        for layer in ["system", "functional", "dev_ops"]:
            if slot_path in slot_map.get("slots", {}).get(layer, {}):
                slot_path = f"{layer}/{slot_path}"
                break
    
    layer, name = slot_path.split("/") if "/" in slot_path else (None, slot_path)
    slot_data = slot_map.get("slots", {}).get(layer, {}).get(name, {})
    
    if not slot_data:
        print(f"❌ Slot not found: {slot_path}")
        return
    
    state["current_slot"] = slot_path
    state["current_goal"] = slot_data.get("done", "Complete this slot")
    save_state(state)
    
    print(f"\n🎯 Focusing on: {slot_path}")
    print(f"📝 Status: {slot_data.get('status', 'PARTIAL')}")
    print(f"✅ Done when: {slot_data.get('done', 'N/A')}")
    
    # 슬롯 파일 읽기
    slot_file = SLOTS_DIR / layer / f"{name}.md"
    if slot_file.exists():
        content = slot_file.read_text()
        # Checklist 추출
        if "## Checklist" in content:
            checklist_start = content.find("## Checklist")
            checklist_end = content.find("##", checklist_start + 1)
            checklist = content[checklist_start:checklist_end if checklist_end > 0 else len(content)]
            print(f"\n{checklist.strip()}")
    
    print("\n" + "━" * 50 + "\n")

def cmd_done(slot_path):
    """슬롯 완료 표시"""
    print_header()
    
    state = load_state()
    slot_map = load_slot_map()
    
    # 슬롯 경로 파싱
    if "/" not in slot_path:
        for layer in ["system", "functional", "dev_ops"]:
            if slot_path in slot_map.get("slots", {}).get(layer, {}):
                slot_path = f"{layer}/{slot_path}"
                break
    
    layer, name = slot_path.split("/") if "/" in slot_path else (None, slot_path)
    
    if layer and name and layer in slot_map.get("slots", {}) and name in slot_map["slots"][layer]:
        slot_map["slots"][layer][name]["status"] = "FILLED"
        save_slot_map(slot_map)
        
        # 슬롯 파일도 업데이트
        slot_file = SLOTS_DIR / layer / f"{name}.md"
        if slot_file.exists():
            content = slot_file.read_text()
            content = content.replace("## Status\nPARTIAL", "## Status\nFILLED")
            slot_file.write_text(content)
        
        print(f"✅ Slot marked as FILLED: {slot_path}")
        
        # 다음 슬롯 제안
        stats, partial_slots = get_slot_stats(slot_map)
        if partial_slots:
            state["current_slot"] = partial_slots[0]
            state["next_candidate_slots"] = partial_slots[:3]
            save_state(state)
            print(f"📍 Next suggested slot: {partial_slots[0]}")
    else:
        print(f"❌ Slot not found: {slot_path}")
    
    print("\n" + "━" * 50 + "\n")

def cmd_end():
    """세션 종료"""
    print_header()
    
    state = load_state()
    slot_map = load_slot_map()
    stats, partial_slots = get_slot_stats(slot_map)
    
    state["session_status"] = "PAUSED"
    state["next_candidate_slots"] = partial_slots[:3]
    save_state(state)
    
    # today.md 업데이트
    today = datetime.now().strftime("%Y-%m-%d")
    
    print(f"\n📊 Session Summary")
    print(f"   Progress: {stats['FILLED']}/{stats['total']} FILLED")
    print(f"   Current Slot: {state.get('current_slot', 'None')}")
    print(f"   Next Candidates: {', '.join(partial_slots[:3])}")
    
    print(f"\n💾 State saved to dev/state.json")
    print(f"📝 Resume with: python scripts/autus_pm.py start")
    print("\n" + "━" * 50 + "\n")

def cmd_status():
    """현재 상태 출력"""
    print_header()
    
    slot_map = load_slot_map()
    stats, partial_slots = get_slot_stats(slot_map)
    
    print(f"\n📊 Slot Status Overview")
    print(f"{'─' * 40}")
    
    for layer in ["system", "functional", "dev_ops"]:
        slots = slot_map.get("slots", {}).get(layer, {})
        print(f"\n[{layer.upper()}]")
        for name, data in slots.items():
            status = data.get("status", "PARTIAL")
            icon = "✅" if status == "FILLED" else "⏳" if status == "PARTIAL" else "⭕"
            print(f"  {icon} {name}: {status}")
    
    print(f"\n{'─' * 40}")
    print(f"Total: {stats['FILLED']}/{stats['total']} FILLED ({int(stats['FILLED']/stats['total']*100)}%)")
    print("\n" + "━" * 50 + "\n")

def main():
    import sys
    
    if len(sys.argv) < 2:
        cmd_start()
        return
    
    cmd = sys.argv[1].lower()
    
    if cmd == "start":
        cmd_start()
    elif cmd == "focus" and len(sys.argv) > 2:
        cmd_focus(sys.argv[2])
    elif cmd == "done" and len(sys.argv) > 2:
        cmd_done(sys.argv[2])
    elif cmd == "end":
        cmd_end()
    elif cmd == "status":
        cmd_status()
    else:
        print("Usage:")
        print("  python scripts/autus_pm.py start         # 세션 시작")
        print("  python scripts/autus_pm.py focus <slot>  # 슬롯 집중")
        print("  python scripts/autus_pm.py done <slot>   # 슬롯 완료")
        print("  python scripts/autus_pm.py end           # 세션 종료")
        print("  python scripts/autus_pm.py status        # 상태 확인")

if __name__ == "__main__":
    main()

