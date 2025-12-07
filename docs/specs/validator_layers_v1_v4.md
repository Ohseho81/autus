# Flow Validator Architecture - V1 to V4

**문서 6번**: Flow JSON 검증 계층 (Syntax → Schema → Semantic → Flow)

---

## 📚 개요

```
Input: Flow JSON
  ↓
V1: Syntax Validator (YAML/JSON 파싱)
  ↓ Valid
V2: Schema Validator (필수 필드, 타입)
  ↓ Valid
V3: Semantic Validator (필드/그룹 정합성)
  ↓ Valid
V4: Flow Validator (Step 순서, Rule 포함)
  ↓ Valid
Output: Validated Flow ✅
```

---

## 1️⃣ V1: Syntax Validator

**목적**: YAML/JSON 파싱 및 기본 구조 검증

### 구현
```python
class SyntaxValidator(BaseValidator):
    """
    V1: Raw JSON/YAML 파싱 및 기본 문법 검증
    - JSON 형식 유효성
    - 필수 최상위 키 확인
    - 인코딩 체크
    """
    
    def validate(self, flow_content: Union[str, dict]) -> ValidationResult:
        """
        Args:
            flow_content: JSON 문자열 또는 dict
        
        Returns:
            ValidationResult(
                is_valid: bool,
                errors: List[ValidationError],
                warnings: List[ValidationWarning]
            )
        """
        errors = []
        warnings = []
        
        try:
            # 1. 파싱 시도
            if isinstance(flow_content, str):
                flow_data = json.loads(flow_content)
            else:
                flow_data = flow_content
            
            # 2. 최상위 구조 확인
            if not isinstance(flow_data, dict):
                errors.append(
                    ValidationError(
                        code="SYNTAX_ERROR_ROOT_NOT_DICT",
                        message="Root must be a JSON object",
                        severity="error",
                        location="$"
                    )
                )
                return ValidationResult(is_valid=False, errors=errors)
            
            # 3. 필수 최상위 키
            required_keys = {"id", "name", "steps"}
            missing_keys = required_keys - set(flow_data.keys())
            
            if missing_keys:
                errors.append(
                    ValidationError(
                        code="SYNTAX_ERROR_MISSING_ROOT_KEYS",
                        message=f"Missing required root keys: {missing_keys}",
                        severity="error",
                        location="$",
                        details={"missing": list(missing_keys)}
                    )
                )
            
            # 4. steps 배열 확인
            if "steps" in flow_data:
                if not isinstance(flow_data["steps"], list):
                    errors.append(
                        ValidationError(
                            code="SYNTAX_ERROR_STEPS_NOT_ARRAY",
                            message="'steps' must be an array",
                            severity="error",
                            location="$.steps"
                        )
                    )
                elif len(flow_data["steps"]) == 0:
                    warnings.append(
                        ValidationWarning(
                            code="SYNTAX_WARNING_EMPTY_STEPS",
                            message="Flow has no steps",
                            location="$.steps"
                        )
                    )
            
            # 5. 각 Step의 기본 구조 확인
            if "steps" in flow_data and isinstance(flow_data["steps"], list):
                for i, step in enumerate(flow_data["steps"]):
                    if not isinstance(step, dict):
                        errors.append(
                            ValidationError(
                                code="SYNTAX_ERROR_STEP_NOT_DICT",
                                message=f"Step[{i}] must be an object",
                                severity="error",
                                location=f"$.steps[{i}]"
                            )
                        )
                    else:
                        if "id" not in step or "type" not in step:
                            errors.append(
                                ValidationError(
                                    code="SYNTAX_ERROR_STEP_MISSING_KEYS",
                                    message=f"Step[{i}] missing required keys (id, type)",
                                    severity="error",
                                    location=f"$.steps[{i}]"
                                )
                            )
            
            is_valid = len(errors) == 0
            return ValidationResult(
                is_valid=is_valid,
                errors=errors,
                warnings=warnings,
                data=flow_data if is_valid else None
            )
        
        except json.JSONDecodeError as e:
            errors.append(
                ValidationError(
                    code="SYNTAX_ERROR_JSON_PARSE",
                    message=f"JSON parse error: {str(e)}",
                    severity="error",
                    location=f"Line {e.lineno}, Column {e.colno}"
                )
            )
            return ValidationResult(is_valid=False, errors=errors)
        
        except Exception as e:
            errors.append(
                ValidationError(
                    code="SYNTAX_ERROR_UNKNOWN",
                    message=f"Unknown error: {str(e)}",
                    severity="error"
                )
            )
            return ValidationResult(is_valid=False, errors=errors)
```

### 테스트 케이스

**TC1.1**: 유효한 JSON
```json
{"id": "test", "name": "Test", "steps": []}
```
✅ Expected: PASS

**TC1.2**: 잘못된 JSON 문법
```json
{"id": "test", "name": "Test", "steps": [}
```
❌ Expected: FAIL (JSON Parse Error)

**TC1.3**: Root가 dict이 아님
```json
["id", "test"]
```
❌ Expected: FAIL (Root not dict)

---

## 2️⃣ V2: Schema Validator

**목적**: 타입 및 필수 필드 검증

### JSON Schema 정의
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "domain", "steps"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9_]+$",
      "minLength": 3,
      "maxLength": 50,
      "description": "Flow identifier (lowercase, underscore allowed)"
    },
    "name": {
      "type": "string",
      "minLength": 3,
      "maxLength": 200,
      "description": "Flow display name"
    },
    "domain": {
      "type": "string",
      "enum": ["visa", "education", "sports", "immigration"],
      "description": "Business domain"
    },
    "steps": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "name", "type", "sequence"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^step_\\d+_[a-z0-9_]+$"
          },
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100
          },
          "type": {
            "type": "string",
            "enum": ["form", "process", "decision", "payment", "document"]
          },
          "sequence": {
            "type": "integer",
            "minimum": 1
          },
          "required": {
            "type": "boolean"
          },
          "fields": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "name", "type"],
              "properties": {
                "id": {
                  "type": "string",
                  "pattern": "^[a-z0-9_]+$"
                },
                "name": {
                  "type": "string"
                },
                "type": {
                  "type": "string",
                  "enum": ["text_input", "file", "dropdown", "date_picker", "checkbox", "radio_group", "textarea", "display"]
                },
                "required": {
                  "type": "boolean"
                },
                "validation": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 구현
```python
from jsonschema import Draft7Validator, ValidationError as JsonSchemaError

class SchemaValidator(BaseValidator):
    """
    V2: JSON Schema 기반 타입 및 필드 검증
    """
    
    FLOW_SCHEMA = {...}  # 위의 JSON Schema
    
    def __init__(self):
        self.validator = Draft7Validator(self.FLOW_SCHEMA)
    
    def validate(self, flow_data: dict) -> ValidationResult:
        errors = []
        warnings = []
        
        # JSON Schema 검증
        for error in self.validator.iter_errors(flow_data):
            errors.append(
                ValidationError(
                    code="SCHEMA_ERROR",
                    message=error.message,
                    severity="error",
                    location=self._path_to_location(error.absolute_path)
                )
            )
        
        # 추가 검증
        # 1. ID 형식 검증
        if "id" in flow_data:
            if not self._validate_id_format(flow_data["id"]):
                errors.append(
                    ValidationError(
                        code="SCHEMA_ERROR_ID_FORMAT",
                        message="Flow ID must match pattern ^[a-z0-9_]+$",
                        severity="error",
                        location="$.id"
                    )
                )
        
        # 2. Step ID 유니크성 검증
        if "steps" in flow_data:
            step_ids = {}
            for i, step in enumerate(flow_data["steps"]):
                if "id" in step:
                    if step["id"] in step_ids:
                        errors.append(
                            ValidationError(
                                code="SCHEMA_ERROR_DUPLICATE_STEP_ID",
                                message=f"Duplicate step ID: {step['id']}",
                                severity="error",
                                location=f"$.steps[{i}].id"
                            )
                        )
                    step_ids[step["id"]] = i
        
        # 3. Field ID 유니크성 (Step 내)
        if "steps" in flow_data:
            for step_idx, step in enumerate(flow_data["steps"]):
                if "fields" in step:
                    field_ids = {}
                    for field_idx, field in enumerate(step["fields"]):
                        if "id" in field:
                            if field["id"] in field_ids:
                                errors.append(
                                    ValidationError(
                                        code="SCHEMA_ERROR_DUPLICATE_FIELD_ID",
                                        message=f"Duplicate field ID in step: {field['id']}",
                                        severity="error",
                                        location=f"$.steps[{step_idx}].fields[{field_idx}].id"
                                    )
                                )
                            field_ids[field["id"]] = field_idx
        
        is_valid = len(errors) == 0
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            data=flow_data if is_valid else None
        )
```

### 테스트 케이스

**TC2.1**: 필드 타입 불일치
```json
{"id": 123, "name": "Test", "domain": "visa", "steps": []}
```
❌ Expected: FAIL (id must be string)

**TC2.2**: 필드값이 enum에 없음
```json
{
  "id": "test", 
  "name": "Test", 
  "domain": "invalid_domain",
  "steps": []
}
```
❌ Expected: FAIL (domain not in enum)

**TC2.3**: 중복된 Step ID
```json
{
  "id": "test",
  "name": "Test",
  "domain": "visa",
  "steps": [
    {"id": "step_1", "name": "S1", "type": "form", "sequence": 1},
    {"id": "step_1", "name": "S2", "type": "form", "sequence": 2}
  ]
}
```
❌ Expected: FAIL (Duplicate step ID)

---

## 3️⃣ V3: Semantic Validator

**목적**: 비즈니스 로직 정합성 검증

### 구현
```python
class SemanticValidator(BaseValidator):
    """
    V3: 비즈니스 로직 및 데이터 정합성 검증
    - Step sequence 연속성
    - Field 타입과 validation 호환성
    - Dependent field 존재 확인
    - Rule 참조 유효성
    """
    
    def validate(self, flow_data: dict) -> ValidationResult:
        errors = []
        warnings = []
        
        # 1. Step sequence 검증
        if "steps" in flow_data:
            sequences = []
            for i, step in enumerate(flow_data["steps"]):
                if "sequence" in step:
                    seq = step["sequence"]
                    if seq in sequences:
                        errors.append(
                            ValidationError(
                                code="SEMANTIC_ERROR_DUPLICATE_SEQUENCE",
                                message=f"Duplicate sequence number: {seq}",
                                severity="error",
                                location=f"$.steps[{i}].sequence"
                            )
                        )
                    sequences.append(seq)
            
            # Step sequence가 1부터 시작하는지 확인
            if sequences and min(sequences) != 1:
                errors.append(
                    ValidationError(
                        code="SEMANTIC_ERROR_SEQUENCE_START",
                        message="Step sequence must start from 1",
                        severity="error",
                        location="$.steps[*].sequence"
                    )
                )
            
            # Step sequence가 연속적인지 확인
            sequences.sort()
            for i, seq in enumerate(sequences, 1):
                if seq != i:
                    errors.append(
                        ValidationError(
                            code="SEMANTIC_ERROR_SEQUENCE_GAP",
                            message=f"Sequence gap detected: expected {i}, got {seq}",
                            severity="error",
                            location="$.steps[*].sequence"
                        )
                    )
        
        # 2. Field validation 호환성 검증
        if "steps" in flow_data:
            for step_idx, step in enumerate(flow_data["steps"]):
                if "fields" in step:
                    for field_idx, field in enumerate(step["fields"]):
                        # text_input에만 pattern 검증 가능
                        if field.get("type") != "text_input":
                            if "validation" in field:
                                validation = field["validation"]
                                if "pattern" in validation:
                                    warnings.append(
                                        ValidationWarning(
                                            code="SEMANTIC_WARNING_VALIDATION_IGNORED",
                                            message=f"'pattern' validation ignored for {field['type']}",
                                            location=f"$.steps[{step_idx}].fields[{field_idx}].validation"
                                        )
                                    )
        
        # 3. Dependent field 존재 확인
        if "steps" in flow_data:
            for step_idx, step in enumerate(flow_data["steps"]):
                if "fields" in step:
                    field_ids = {f.get("id"): i for i, f in enumerate(step["fields"])}
                    
                    for field_idx, field in enumerate(step["fields"]):
                        if "dependent_on" in field:
                            dep_field = field["dependent_on"]
                            if dep_field not in field_ids:
                                errors.append(
                                    ValidationError(
                                        code="SEMANTIC_ERROR_MISSING_DEPENDENT",
                                        message=f"Dependent field not found: {dep_field}",
                                        severity="error",
                                        location=f"$.steps[{step_idx}].fields[{field_idx}].dependent_on"
                                    )
                                )
        
        # 4. Rule 참조 검증
        if "steps" in flow_data:
            step_ids = {s.get("id"): i for i, s in enumerate(flow_data["steps"])}
            
            for step_idx, step in enumerate(flow_data["steps"]):
                if "depends_on" in step:
                    for dep_step in step.get("depends_on", []):
                        if dep_step not in step_ids:
                            errors.append(
                                ValidationError(
                                    code="SEMANTIC_ERROR_MISSING_STEP_REFERENCE",
                                    message=f"Referenced step not found: {dep_step}",
                                    severity="error",
                                    location=f"$.steps[{step_idx}].depends_on"
                                )
                            )
                
                # Rule에서 참조하는 Step 확인
                if "rules" in step:
                    for rule_idx, rule in enumerate(step["rules"]):
                        if "then" in rule:
                            target = rule["then"]
                            # "proceed_to_step_X" 패턴 확인
                            if target.startswith("proceed_to_"):
                                target_step = target.replace("proceed_to_", "")
                                if target_step not in step_ids:
                                    errors.append(
                                        ValidationError(
                                            code="SEMANTIC_ERROR_INVALID_RULE_TARGET",
                                            message=f"Rule target not found: {target_step}",
                                            severity="error",
                                            location=f"$.steps[{step_idx}].rules[{rule_idx}].then"
                                        )
                                    )
        
        is_valid = len(errors) == 0
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            data=flow_data if is_valid else None
        )
```

### 테스트 케이스

**TC3.1**: Step sequence가 1부터 시작하지 않음
```json
{
  "id": "test",
  "name": "Test",
  "domain": "visa",
  "steps": [
    {"id": "s1", "name": "S1", "type": "form", "sequence": 2}
  ]
}
```
❌ Expected: FAIL

**TC3.2**: Dependent field가 존재하지 않음
```json
{
  "steps": [
    {
      "id": "step_1",
      "name": "S1",
      "type": "form",
      "sequence": 1,
      "fields": [
        {"id": "f1", "name": "F1", "type": "dropdown", "dependent_on": "missing_field"}
      ]
    }
  ]
}
```
❌ Expected: FAIL

**TC3.3**: Rule이 존재하지 않는 Step을 참조
```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "form",
      "sequence": 1,
      "rules": [
        {"condition": "x==1", "then": "proceed_to_missing_step"}
      ]
    }
  ]
}
```
❌ Expected: FAIL

---

## 4️⃣ V4: Flow Validator

**목적**: 프로세스 흐름 및 비즈니스 규칙 검증

### 구현
```python
class FlowValidator(BaseValidator):
    """
    V4: 프로세스 흐름 및 엣지케이스 검증
    - Circular dependency 감지
    - 모든 Step의 exit point 확인
    - Final step 정의 여부
    - 규칙 불가능한 조건 감지
    """
    
    def validate(self, flow_data: dict) -> ValidationResult:
        errors = []
        warnings = []
        
        # 1. Circular dependency 감지 (DFS)
        if "steps" in flow_data:
            step_graph = self._build_step_graph(flow_data["steps"])
            cycles = self._detect_cycles(step_graph)
            
            if cycles:
                for cycle in cycles:
                    errors.append(
                        ValidationError(
                            code="FLOW_ERROR_CIRCULAR_DEPENDENCY",
                            message=f"Circular dependency detected: {' -> '.join(cycle)}",
                            severity="error",
                            location="$.steps[*].rules[*].then"
                        )
                    )
        
        # 2. 모든 Step이 도달 가능한지 확인
        if "steps" in flow_data:
            unreachable = self._find_unreachable_steps(flow_data["steps"])
            
            for step_id in unreachable:
                errors.append(
                    ValidationError(
                        code="FLOW_WARNING_UNREACHABLE_STEP",
                        message=f"Step may be unreachable: {step_id}",
                        severity="warning",
                        location=f"$.steps[?(@.id=='{step_id}')]"
                    )
                )
        
        # 3. Final step 확인
        has_final_step = any(
            s.get("final_step", False) 
            for s in flow_data.get("steps", [])
        )
        
        if not has_final_step:
            warnings.append(
                ValidationWarning(
                    code="FLOW_WARNING_NO_FINAL_STEP",
                    message="Flow has no final step marked",
                    location="$.steps[*]"
                )
            )
        
        # 4. Rule 논리 검증
        if "steps" in flow_data:
            for step_idx, step in enumerate(flow_data["steps"]):
                if "rules" in step:
                    for rule_idx, rule in enumerate(step["rules"]):
                        # condition이 완전한지 확인
                        condition = rule.get("condition", "")
                        if condition and not self._is_valid_condition(condition):
                            errors.append(
                                ValidationError(
                                    code="FLOW_ERROR_INVALID_CONDITION",
                                    message=f"Invalid condition syntax: {condition}",
                                    severity="error",
                                    location=f"$.steps[{step_idx}].rules[{rule_idx}].condition"
                                )
                            )
        
        # 5. Step completion 경로 확인
        if "steps" in flow_data:
            for step_idx, step in enumerate(flow_data["steps"]):
                if "auto_proceed" in step and not step["auto_proceed"]:
                    # Manual proceed는 규칙이 있어야 함
                    if "rules" not in step or len(step["rules"]) == 0:
                        warnings.append(
                            ValidationWarning(
                                code="FLOW_WARNING_NO_COMPLETION_RULE",
                                message=f"Step {step.get('id')} requires manual proceed but has no rules",
                                location=f"$.steps[{step_idx}]"
                            )
                        )
        
        is_valid = len(errors) == 0
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            data=flow_data if is_valid else None
        )
    
    def _build_step_graph(self, steps: list) -> dict:
        """Step 간의 의존성 그래프 구축"""
        graph = {}
        for step in steps:
            step_id = step.get("id")
            graph[step_id] = []
            
            for rule in step.get("rules", []):
                target = rule.get("then", "")
                if target.startswith("proceed_to_"):
                    target_step = target.replace("proceed_to_", "")
                    graph[step_id].append(target_step)
        
        return graph
    
    def _detect_cycles(self, graph: dict) -> list:
        """DFS로 사이클 감지"""
        visited = set()
        rec_stack = set()
        cycles = []
        
        def dfs(node, path):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor, path[:])
                elif neighbor in rec_stack:
                    cycles.append(path[path.index(neighbor):] + [neighbor])
            
            rec_stack.remove(node)
        
        for node in graph:
            if node not in visited:
                dfs(node, [])
        
        return cycles
```

### 테스트 케이스

**TC4.1**: Circular dependency
```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "form",
      "sequence": 1,
      "rules": [{"then": "proceed_to_step_2"}]
    },
    {
      "id": "step_2",
      "type": "form",
      "sequence": 2,
      "rules": [{"then": "proceed_to_step_1"}]
    }
  ]
}
```
❌ Expected: FAIL (Circular dependency)

**TC4.2**: Unreachable step
```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "form",
      "sequence": 1,
      "rules": [{"then": "proceed_to_step_3"}]
    },
    {
      "id": "step_2",
      "type": "form",
      "sequence": 2
    },
    {
      "id": "step_3",
      "type": "form",
      "sequence": 3
    }
  ]
}
```
⚠️ Expected: WARNING (step_2 unreachable)

---

## 5️⃣ 통합 검증 클래스

```python
class FlowValidatorChain:
    """V1 → V2 → V3 → V4 순서로 검증 실행"""
    
    def __init__(self):
        self.validators = [
            SyntaxValidator(),
            SchemaValidator(),
            SemanticValidator(),
            FlowValidator()
        ]
    
    def validate(self, flow_content: Union[str, dict]) -> ValidationResult:
        current_data = flow_content
        all_errors = []
        all_warnings = []
        
        for validator in self.validators:
            result = validator.validate(current_data)
            
            all_errors.extend(result.errors)
            all_warnings.extend(result.warnings)
            
            if not result.is_valid:
                # 다음 검증은 스킵 (이미 데이터가 유효하지 않음)
                break
            
            current_data = result.data
        
        return ValidationResult(
            is_valid=len(all_errors) == 0,
            errors=all_errors,
            warnings=all_warnings,
            data=current_data if len(all_errors) == 0 else None,
            validator_stages=[v.__class__.__name__ for v in self.validators]
        )
```

---

## 6️⃣ API 엔드포인트

```python
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/validate", tags=["validation"])

@router.post("/app/{app_id}")
async def validate_flow(app_id: str, flow_content: dict):
    """
    Flow JSON 검증
    
    Request:
        POST /api/v1/validate/app/ph_kr_kw
        {
          "id": "ph_kr_kw",
          "name": "PH Korea Kwangwoon",
          ...
        }
    
    Response:
        {
          "is_valid": true,
          "errors": [],
          "warnings": [],
          "validation_stages": ["SyntaxValidator", "SchemaValidator", ...],
          "data": {...}
        }
    """
    
    validator = FlowValidatorChain()
    result = validator.validate(flow_content)
    
    return {
        "is_valid": result.is_valid,
        "errors": [e.to_dict() for e in result.errors],
        "warnings": [w.to_dict() for w in result.warnings],
        "validation_stages": result.validator_stages,
        "data": result.data if result.is_valid else None
    }
```

---

## 7️⃣ 실행 흐름 예시

```
Input:
{
  "id": "ph_kr_kw",
  "steps": [...]
}

V1 (SyntaxValidator):
  ✅ JSON 파싱 성공
  ✅ 최상위 키 확인 성공

V2 (SchemaValidator):
  ✅ 타입 검증 성공
  ✅ 필드 유니크성 검증 성공

V3 (SemanticValidator):
  ✅ Sequence 연속성 확인
  ✅ Rule 참조 유효성 확인

V4 (FlowValidator):
  ✅ 순환 의존성 없음
  ✅ 모든 Step 도달 가능

✅ FINAL RESULT: VALID
```

---

## 📁 구현 구조

```
validators/
├── __init__.py
├── base.py               (BaseValidator, ValidationResult)
├── v1_syntax.py          (SyntaxValidator)
├── v2_schema.py          (SchemaValidator)
├── v3_semantic.py        (SemanticValidator)
├── v4_flow.py            (FlowValidator)
├── chain.py              (FlowValidatorChain)
└── models.py             (ValidationError, ValidationWarning)
```
