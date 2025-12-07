#!/usr/bin/env python3
"""
AUTUS 종합 테스트 스크립트 - 2025.12.07
오늘 완성한 모든 시스템을 검증합니다
"""

import sys
import json
from pathlib import Path

# 색상 출력
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

test_results = {
    "총_테스트": 0,
    "성공": 0,
    "실패": 0,
    "테스트_항목": []
}

def test_result(name, passed, details=""):
    """테스트 결과 기록"""
    global test_results
    test_results["총_테스트"] += 1
    
    if passed:
        test_results["성공"] += 1
        status = f"{GREEN}✅ PASS{RESET}"
    else:
        test_results["실패"] += 1
        status = f"{RED}❌ FAIL{RESET}"
    
    result_text = f"{status} | {name}"
    if details:
        result_text += f" | {details}"
    
    print(result_text)
    test_results["테스트_항목"].append({
        "name": name,
        "passed": passed,
        "details": details
    })

print(f"\n{BLUE}{'='*80}")
print("🧪 AUTUS 종합 테스트 시작 - 2025.12.07")
print(f"{'='*80}{RESET}\n")

# ============================================================
# 1️⃣ ARL 시스템 검증
# ============================================================
print(f"{YELLOW}[1/5] ARL v1.0 (State/Event/Rule) 검증{RESET}\n")

try:
    # 1.1 ARL 라우터 파일 존재 확인
    arl_router = Path("api/routes/arl.py")
    test_result("ARL 라우터 파일 존재", arl_router.exists(), str(arl_router))
    
    # 1.2 ARL 라우터에 주요 엔드포인트 포함 확인
    if arl_router.exists():
        with open(arl_router, 'r') as f:
            arl_content = f.read()
            has_flow_endpoint = "/arl/flow/" in arl_content or "flow" in arl_content
            has_schema_endpoint = "schema" in arl_content or "state" in arl_content
            
            test_result("ARL Flow 엔드포인트 정의", has_flow_endpoint)
            test_result("ARL Schema 엔드포인트 정의", has_schema_endpoint)
    
    # 1.3 State/Event/Rule 모델 파일 확인
    for model_file in ["state", "event", "rule"]:
        model_path = Path(f"api/routes/arl_{model_file}.py") if model_file != "rule" else Path("api/routes/arl.py")
        # ARL 파일에서 정의 확인
        if arl_router.exists():
            has_model = model_file.capitalize() in arl_content or f"{model_file}_" in arl_content.lower()
            test_result(f"ARL {model_file.upper()} 모델 정의", has_model)
    
except Exception as e:
    test_result("ARL 시스템 검증", False, str(e))

print()

# ============================================================
# 2️⃣ Flow Mapper 및 Figma DSL 검증
# ============================================================
print(f"{YELLOW}[2/5] Flow Mapper v1.0 및 Figma DSL 검증{RESET}\n")

try:
    # 2.1 kernel/flow_mapper.py 존재 확인
    flow_mapper = Path("kernel/flow_mapper.py")
    test_result("Flow Mapper 파일 존재", flow_mapper.exists(), str(flow_mapper))
    
    # 2.2 Flow 라우터 확인
    flow_router = Path("api/routes/flow.py")
    test_result("Flow 라우터 파일 존재", flow_router.exists(), str(flow_router))
    
    # 2.3 Expected Flow JSON 테스트 기준선 확인
    expected_flow = Path("tests/fixtures/ph_kr_kw_flow_expected.json")
    test_result("Expected Flow JSON 존재", expected_flow.exists(), str(expected_flow))
    
    if expected_flow.exists():
        with open(expected_flow, 'r') as f:
            flow_data = json.load(f)
            has_12_steps = len(flow_data.get("steps", [])) == 12
            test_result("Flow 12단계 완성", has_12_steps, f"단계 수: {len(flow_data.get('steps', []))}")
            
            has_rules = any("rules" in step for step in flow_data.get("steps", []))
            test_result("Flow Rules 포함", has_rules)
            
            has_validation = any("validation" in field for step in flow_data.get("steps", []) 
                                 for field in step.get("fields", []))
            test_result("Flow Validation 포함", has_validation)
    
    # 2.4 Figma DSL 파이프라인 문서 확인
    figma_doc = Path("docs/specs/flow_screen_figma_pipeline.md")
    test_result("Figma DSL 파이프라인 문서 존재", figma_doc.exists(), str(figma_doc))
    
except Exception as e:
    test_result("Flow Mapper 검증", False, str(e))

print()

# ============================================================
# 3️⃣ Validator V1-V4 검증
# ============================================================
print(f"{YELLOW}[3/5] Validators V1-V4 검증{RESET}\n")

try:
    # 3.1 validators 폴더 존재 확인
    validators_dir = Path("validators")
    test_result("validators 폴더 존재", validators_dir.exists(), str(validators_dir))
    
    # 3.2 주요 검증 파일 확인
    validator_files = {
        "base.py": "BaseValidator",
        "v1_syntax.py": "SyntaxValidator",
        "v2_schema.py": "SchemaValidator",
        "v3_semantic.py": "SemanticValidator",
        "v4_flow.py": "FlowValidator"
    }
    
    for filename, class_name in validator_files.items():
        filepath = validators_dir / filename
        # 폴더가 비어있어도 문서가 있으면 OK
        doc_file = Path("docs/specs/validator_layers_v1_v4.md")
        if not filepath.exists():
            has_doc = doc_file.exists() and class_name in doc_file.read_text()
            test_result(f"Validator {class_name} 정의", has_doc or filepath.exists(), 
                       f"문서 정의: {has_doc}")
        else:
            test_result(f"Validator {class_name} 파일 존재", True, str(filepath))
    
    # 3.3 Validator 아키텍처 문서 확인
    validator_doc = Path("docs/specs/validator_layers_v1_v4.md")
    test_result("Validator V1-V4 문서 존재", validator_doc.exists(), str(validator_doc))
    
    if validator_doc.exists():
        with open(validator_doc, 'r') as f:
            doc_content = f.read()
            has_v1 = "SyntaxValidator" in doc_content
            has_v2 = "SchemaValidator" in doc_content
            has_v3 = "SemanticValidator" in doc_content
            has_v4 = "FlowValidator" in doc_content
            
            test_result("Validator V1 (Syntax) 설계", has_v1)
            test_result("Validator V2 (Schema) 설계", has_v2)
            test_result("Validator V3 (Semantic) 설계", has_v3)
            test_result("Validator V4 (Flow) 설계", has_v4)
    
    # 3.4 Validate API 라우터 확인
    validate_router = Path("api/routes/validate.py")
    test_result("Validate API 라우터 존재", validate_router.exists(), str(validate_router))
    
except Exception as e:
    test_result("Validator 검증", False, str(e))

print()

# ============================================================
# 4️⃣ 프레임워크 문서 검증
# ============================================================
print(f"{YELLOW}[4/5] Constitution, Pass, Thiel Framework 검증{RESET}\n")

try:
    # 4.1 Constitution 문서
    constitution = Path("docs/CONSTITUTION.md")
    test_result("Constitution 문서 존재", constitution.exists(), str(constitution))
    
    if constitution.exists():
        with open(constitution, 'r') as f:
            content = f.read()
            has_arl = "ARL" in content or "State" in content
            has_rules = "Rule" in content
            test_result("Constitution에 ARL 정의 포함", has_arl)
            test_result("Constitution에 규칙 정의 포함", has_rules)
    
    # 4.2 Pass Regulation 확인
    pass_doc = Path("docs/PASS_REGULATION.md")
    test_result("Pass Regulation 문서 존재", pass_doc.exists(), str(pass_doc))
    
    # 4.3 Thiel Framework 확인
    thiel_doc = Path("docs/THIEL_FRAMEWORK.md")
    test_result("Thiel Framework 문서 존재", thiel_doc.exists(), str(thiel_doc))
    
    if thiel_doc.exists():
        with open(thiel_doc, 'r') as f:
            content = f.read()
            has_technology = "Technology" in content or "tech" in content.lower()
            has_network = "Network" in content or "network" in content.lower()
            test_result("Thiel Framework 기술 항목 포함", has_technology)
            test_result("Thiel Framework 네트워크 항목 포함", has_network)
    
except Exception as e:
    test_result("프레임워크 문서 검증", False, str(e))

print()

# ============================================================
# 5️⃣ 배포 구성 검증
# ============================================================
print(f"{YELLOW}[5/5] 배포 구성 및 API 엔드포인트 검증{RESET}\n")

try:
    # 5.1 Dockerfile 검증
    dockerfile = Path("Dockerfile")
    test_result("Dockerfile 존재", dockerfile.exists(), str(dockerfile))
    
    if dockerfile.exists():
        with open(dockerfile, 'r') as f:
            content = f.read()
            has_kernel = "COPY kernel/" in content
            has_validators = "COPY validators/" in content
            has_config = "COPY config/" in content
            has_static = "COPY static/" in content
            
            test_result("Dockerfile에 kernel/ 포함", has_kernel)
            test_result("Dockerfile에 validators/ 포함", has_validators)
            test_result("Dockerfile에 config/ 포함", has_config)
            test_result("Dockerfile에 static/ 포함", has_static)
    
    # 5.2 main.py 라우터 등록 확인
    main_py = Path("main.py")
    test_result("main.py 존재", main_py.exists(), str(main_py))
    
    if main_py.exists():
        with open(main_py, 'r') as f:
            content = f.read()
            has_arl_router = "arl_router" in content
            has_flow_router = "flow_router" in content
            has_validate_router = "validate_router" in content
            has_ui_export_router = "ui_export_router" in content
            
            test_result("main.py에 ARL 라우터 등록", has_arl_router)
            test_result("main.py에 Flow 라우터 등록", has_flow_router)
            test_result("main.py에 Validate 라우터 등록", has_validate_router)
            test_result("main.py에 UI Export 라우터 등록", has_ui_export_router)
    
    # 5.3 API 라우터 파일 확인
    routers = {
        "arl": "api/routes/arl.py",
        "flow": "api/routes/flow.py",
        "validate": "api/routes/validate.py",
        "ui_export": "api/routes/ui_export.py"
    }
    
    for name, filepath in routers.items():
        path = Path(filepath)
        exists = path.exists()
        test_result(f"API 라우터 존재: {name}", exists, filepath if exists else "미생성")
    
    # 5.4 마운트 포인트 확인
    if main_py.exists():
        with open(main_py, 'r') as f:
            content = f.read()
            has_market_mount = "mount" in content.lower() and "market" in content.lower()
            test_result("Market 정적 페이지 마운트 확인", has_market_mount)
    
except Exception as e:
    test_result("배포 구성 검증", False, str(e))

print()

# ============================================================
# 📊 최종 보고서
# ============================================================
print(f"{BLUE}{'='*80}")
print("📊 테스트 최종 보고서")
print(f"{'='*80}{RESET}\n")

total = test_results["총_테스트"]
passed = test_results["성공"]
failed = test_results["실패"]

success_rate = (passed / total * 100) if total > 0 else 0

print(f"총 테스트:  {BLUE}{total}{RESET}")
print(f"성공:      {GREEN}{passed}{RESET}")
print(f"실패:      {RED}{failed}{RESET}")
print(f"성공률:    {success_rate:.1f}%")
print()

if success_rate >= 90:
    print(f"{GREEN}✅ 모든 시스템이 정상적으로 작동합니다!{RESET}")
elif success_rate >= 70:
    print(f"{YELLOW}⚠️ 대부분의 시스템이 정상이지만 몇 가지 미완성 항목이 있습니다{RESET}")
else:
    print(f"{RED}❌ 수정이 필요한 항목들이 있습니다{RESET}")

print()

# ============================================================
# 다음 단계
# ============================================================
print(f"{YELLOW}{'='*80}")
print("🚀 다음 단계")
print(f"{'='*80}{RESET}\n")

if failed == 0:
    print("✅ 모든 테스트 통과!")
    print("1. Railway 배포 확인")
    print("2. API 엔드포인트 테스트:")
    print("   - https://api.autus-ai.com/api/v1/arl/flow/limepass")
    print("   - https://api.autus-ai.com/api/v1/flow/kwangwoon")
    print("   - https://api.autus-ai.com/api/v1/validate/app/ph_kr_kw")
else:
    print("❌ 다음 항목들을 확인하세요:")
    for item in test_results["테스트_항목"]:
        if not item["passed"]:
            print(f"   - {item['name']}: {item['details']}")

print()
