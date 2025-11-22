"""
AUTUS CLI
"""
import sys
import json
import yaml
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# 경로 설정 import
try:
    import sys
    sys.path.insert(0, str(ROOT))
    from config import (
        PROJECT_ROOT,
        CORE_DIR,
        PACKS_DIR,
        PACKS_DEVELOPMENT_DIR,
        PACKS_EXAMPLES_DIR,
        PACKS_INTEGRATION_DIR,
        AUTUS_CONFIG_FILE
    )
except ImportError:
    # fallback (개발 중일 때)
    PROJECT_ROOT = ROOT
    CORE_DIR = ROOT / "core"
    PACKS_DIR = ROOT / "packs"
    PACKS_DEVELOPMENT_DIR = PACKS_DIR / "development"
    PACKS_EXAMPLES_DIR = PACKS_DIR / "examples"
    PACKS_INTEGRATION_DIR = PACKS_DIR / "integration"
    AUTUS_CONFIG_FILE = ROOT / ".autus"

# 동적 import로 경로 문제 해결
import importlib.util

def _load_module(module_path, module_name):
    """모듈 동적 로드"""
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# autusfile 모듈 로드 (선택적 - 없어도 동작)
_autusfile_path = CORE_DIR / "autusfile.py"
autusfile = None
if _autusfile_path.exists():
    autusfile = _load_module(_autusfile_path, "autusfile")

# dsl 모듈 로드 (선택적 - 없어도 동작)
_dsl_path = CORE_DIR / "dsl.py"
dsl = None
if _dsl_path.exists():
    dsl = _load_module(_dsl_path, "dsl")

def main():
    """CLI 메인"""

    if len(sys.argv) < 2:
        print_help()
        return

    command = sys.argv[1]

    if command == "init":
        # 프로젝트 초기화
        project = sys.argv[2] if len(sys.argv) > 2 else "my_project"
        if autusfile and hasattr(autusfile, "create"):
            autusfile.create(project)
        else:
            # 간단한 .autus 파일 생성
            with open(AUTUS_CONFIG_FILE, 'w', encoding='utf-8') as f:
                f.write(f"project: {project}\n")
                f.write("cells: {}\n")
                f.write("context: {}\n")
            print(f"✅ .autus 파일 생성: {project}")

    elif command == "run":
        # Cell 실행
        if len(sys.argv) < 3:
            print("❌ 사용법: autus run <command>")
            print("   예시: autus run 'GET https://api.github.com/users/github'")
            return

        cmd = sys.argv[2]

        # .autus 있으면 context 로드
        context = {}
        if AUTUS_CONFIG_FILE.exists():
            try:
                if autusfile and hasattr(autusfile, "parse"):
                    config = autusfile.parse()
                    context = config.get("context", {})
                else:
                    # 간단한 YAML 파싱
                    with open(AUTUS_CONFIG_FILE, 'r', encoding='utf-8') as f:
                        config = yaml.safe_load(f) or {}
                        context = config.get("context", {})
            except Exception as e:
                print(f"⚠️  .autus 파일 로드 실패: {e}")

        print(f"🚀 실행: {cmd}\n")
        try:
            if dsl and hasattr(dsl, "run"):
                result = dsl.run(cmd, context)
                print(f"\n✅ 결과:")
                print(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                # 간단한 DSL 실행 (PER Loop 사용)
                from core.engine.per_loop import PERLoop
                loop = PERLoop()
                review = loop.run(cmd)
                print(f"\n✅ 실행 완료:")
                print(f"  성공률: {review.get('success_rate', 0):.1%}")
                print(f"  요약: {review.get('summary', 'N/A')}")
        except Exception as e:
            print(f"\n❌ 실행 실패: {e}")
            import traceback
            traceback.print_exc()

    elif command == "create":
        # Cell 생성
        if len(sys.argv) < 3:
            print("❌ 사용법: autus create <description>")
            return

        try:
            # LLM 모듈 직접 import
            from core.llm.llm import generate_cell
            llm = type('obj', (object,), {'generate_cell': generate_cell})()

            if llm and hasattr(llm, "generate_cell"):
                description = " ".join(sys.argv[2:])
                print(f"🤖 Cell 생성 중: {description}\n")

                cell = llm.generate_cell(description)
                print(f"✅ 생성된 Cell:\n  {cell}")
            else:
                print("⚠️  LLM 모듈을 사용할 수 없습니다")
        except Exception as e:
            print(f"❌ Cell 생성 실패: {e}")

    elif command == "list":
        # Cell 목록
        if not AUTUS_CONFIG_FILE.exists():
            print("❌ .autus 파일 없음")
            return

        try:
            if autusfile and hasattr(autusfile, "parse"):
                config = autusfile.parse()
            else:
                with open(AUTUS_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = yaml.safe_load(f) or {}

            print(f"📦 프로젝트: {config.get('project', 'unknown')}\n")
            cells = config.get("cells", {})
            if cells:
                print("Cells:")
                for name, cell in cells.items():
                    desc = cell.get("description", cell.get("command", ""))
                    print(f"  - {name}: {desc}")
            else:
                print("Cells: 없음")
        except Exception as e:
            print(f"❌ .autus 파일 읽기 실패: {e}")

    elif command == "packs":
        # Pack 목록 (YAML 직접 읽기)
        if not PACKS_DIR.exists():
            print("📦 Pack 디렉터리 없음")
            return

        packs = []
        # 루트 YAML 파일 스캔
        for pack_file in PACKS_DIR.glob("*.yaml"):
            try:
                with open(pack_file, 'r', encoding='utf-8') as f:
                    pack_data = yaml.safe_load(f)
                    if pack_data:
                        packs.append({
                            "name": pack_data.get("pack_name", pack_file.stem),
                            "version": pack_data.get("version", "1.0.0"),
                            "description": pack_data.get("metadata", {}).get("description", "No description")
                        })
            except Exception as e:
                print(f"⚠️  {pack_file.name} 로드 실패: {e}")

        # 하위 디렉토리 스캔
        for pack_subdir_path in [PACKS_DEVELOPMENT_DIR, PACKS_EXAMPLES_DIR, PACKS_INTEGRATION_DIR]:
            if pack_subdir_path.exists():
                for pack_file in pack_subdir_path.glob("*.yaml"):
                    try:
                        with open(pack_file, 'r', encoding='utf-8') as f:
                            pack_data = yaml.safe_load(f)
                            if pack_data:
                                packs.append({
                                    "name": pack_data.get("name") or pack_data.get("pack_name", pack_file.stem),
                                    "version": pack_data.get("version", "1.0.0"),
                                    "description": pack_data.get("metadata", {}).get("description", f"{pack_subdir} pack")
                                })
                    except Exception:
                        pass

        if not packs:
            print("📦 Pack 없음")
            return

        print("📦 사용 가능한 Packs:\n")
        for p in sorted(packs, key=lambda x: x['name']):
            print(f"  {p['name']} v{p['version']}")
            print(f"  └─ {p['description']}\n")

    else:
        print_help()

def print_help():
    """도움말"""
    print("""
🌌 AUTUS CLI v1.0
개인 AI 자동화 OS

사용법:
  autus init [project]           .autus 파일 생성
  autus run <command>            Cell 실행 (DSL)
  autus create <description>     Cell 생성 (LLM)
  autus list                     Cell 목록
  autus packs                    Pack 목록

예시:
  autus init weather-bot
  autus run "GET https://api.github.com/users/github"
  autus run "echo hello | parse"
  autus create "서울 날씨 조회"
  autus list
  autus packs

더 많은 정보: README.md 참조
""")

if __name__ == "__main__":
    main()
