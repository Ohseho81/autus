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

# autusfile 모듈 로드
_autusfile_path = ROOT / "01_core" / "autusfile.py"
autusfile = _load_module(_autusfile_path, "autusfile")

# dsl 모듈 로드
_dsl_path = ROOT / "01_core" / "dsl.py"
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
        autusfile.create(project)

    elif command == "run":
        # Cell 실행
        if len(sys.argv) < 3:
            print("❌ 사용법: autus run <command>")
            print("   예시: autus run 'GET https://api.github.com/users/github'")
            return

        cmd = sys.argv[2]

        # .autus 있으면 context 로드
        context = {}
        if (ROOT / ".autus").exists():
            try:
                if autusfile:
                    config = autusfile.parse()
                    context = config.get("context", {})
            except Exception as e:
                print(f"⚠️  .autus 파일 로드 실패: {e}")

        print(f"🚀 실행: {cmd}\n")
        try:
            if dsl:
                result = dsl.run(cmd, context)
                print(f"\n✅ 결과:")
                print(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                print("❌ DSL 모듈을 로드할 수 없습니다")
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
            _llm_path = ROOT / "01_core" / "llm.py"
            llm = _load_module(_llm_path, "llm")

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
        if not Path(".autus").exists():
            print("❌ .autus 파일 없음")
            return

        config = autusfile.parse()
        print(f"📦 프로젝트: {config['project']}\n")
        print("Cells:")
        autusfile.list_cells(config)

    elif command == "packs":
        # Pack 목록 (YAML 직접 읽기)
        pack_dir = ROOT / "02_packs"

        if not pack_dir.exists():
            print("📦 Pack 디렉터리 없음")
            return

        packs = []
        # YAML 파일 스캔
        for pack_file in pack_dir.glob("*.yaml"):
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

        # Python Pack도 스캔 (builtin, autogen)
        for pack_subdir in ["builtin", "autogen"]:
            pack_subdir_path = pack_dir / pack_subdir
            if pack_subdir_path.exists():
                for pack_file in pack_subdir_path.glob("*_pack.py"):
                    try:
                        # 파일명에서 pack 이름 추출
                        pack_name = pack_file.stem.replace("_pack", "")
                        packs.append({
                            "name": pack_name,
                            "version": "1.0.0",
                            "description": f"{pack_subdir} pack"
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
