# Flow → Screen → Figma DSL 파이프라인

**문서 4번**: PH→광운대 12단계 UI 완성형 구현 가이드

---

## 📐 파이프라인 개요

```
┌─────────────────┐
│  Flow JSON      │  (ARL Flow 정의)
└────────┬────────┘
         │ (Flow Mapper)
         ↓
┌─────────────────┐
│  Screen Model   │  (UI 구조 + 컴포넌트)
└────────┬────────┘
         │ (Screen→Figma Converter)
         ↓
┌─────────────────┐
│  Figma DSL      │  (Design System Language)
└─────────────────┘
```

---

## 1️⃣ Flow JSON → Screen Model 변환

### Input: Flow JSON 구조
```json
{
  "id": "ph_kr_kw",
  "name": "PH Korea Kwangwoon",
  "domain": "visa",
  "steps": [
    {
      "id": "step_1_collect_docs",
      "name": "서류 수집",
      "type": "form",
      "fields": [
        {
          "id": "passport",
          "name": "여권",
          "type": "file",
          "required": true,
          "validation": "pdf|jpg"
        }
      ]
    },
    {
      "id": "step_2_verify_docs",
      "name": "서류 검증",
      "type": "process",
      "rules": [
        {
          "condition": "passport.valid == true",
          "then": "proceed_to_step_3"
        }
      ]
    }
  ]
}
```

### Output: Screen Model 구조
```json
{
  "id": "ph_kr_kw_screens",
  "flow_id": "ph_kr_kw",
  "screens": [
    {
      "id": "screen_1_collect_docs",
      "step_id": "step_1_collect_docs",
      "title": "서류 수집",
      "layout": "single_column",
      "components": [
        {
          "type": "text_input",
          "label": "여권 파일",
          "id": "passport",
          "placeholder": "PDF 또는 JPG 형식",
          "validation": "pdf|jpg",
          "required": true
        },
        {
          "type": "file_upload",
          "id": "passport_upload",
          "accept": ".pdf,.jpg,.jpeg"
        },
        {
          "type": "button",
          "id": "next_button",
          "label": "다음",
          "action": "submit_form"
        }
      ]
    }
  ]
}
```

---

## 2️⃣ Screen Model → Figma DSL 변환

### Screen Model Input
```json
{
  "id": "screen_1_collect_docs",
  "title": "서류 수집",
  "layout": "single_column",
  "components": [...]
}
```

### Output: Figma DSL
```json
{
  "id": "figma_frame_screen_1",
  "type": "frame",
  "name": "서류 수집 (Step 1/12)",
  "width": 360,
  "height": 800,
  "fill": "#050608",
  "children": [
    {
      "id": "figma_header_step_counter",
      "type": "group",
      "name": "Header with Step Counter",
      "children": [
        {
          "type": "text",
          "name": "Step Title",
          "content": "Step 1/12",
          "fontSize": 14,
          "fontWeight": "600",
          "fill": "#888888"
        },
        {
          "type": "text",
          "name": "Screen Title",
          "content": "서류 수집",
          "fontSize": 18,
          "fontWeight": "700",
          "fill": "#F5F5F5"
        }
      ]
    },
    {
      "id": "figma_form_group",
      "type": "group",
      "name": "Form Fields",
      "children": [
        {
          "type": "text",
          "name": "Label",
          "content": "여권 파일",
          "fontSize": 12,
          "fontWeight": "600",
          "fill": "#F5F5F5"
        },
        {
          "type": "text",
          "name": "Subtext",
          "content": "PDF 또는 JPG 형식",
          "fontSize": 11,
          "fill": "#888888"
        },
        {
          "type": "rectangle",
          "name": "File Upload Area",
          "width": 328,
          "height": 120,
          "fill": "#0D0E14",
          "stroke": "#333333",
          "strokeWidth": 1,
          "strokeDasharray": [4, 4],
          "cornerRadius": 8
        }
      ]
    },
    {
      "id": "figma_button_group",
      "type": "group",
      "name": "Action Buttons",
      "children": [
        {
          "type": "rectangle",
          "name": "Next Button",
          "width": 328,
          "height": 44,
          "fill": "#4F46E5",
          "cornerRadius": 999
        },
        {
          "type": "text",
          "name": "Button Label",
          "content": "다음",
          "fontSize": 14,
          "fontWeight": "600",
          "fill": "#FFFFFF"
        }
      ]
    }
  ]
}
```

---

## 3️⃣ 12단계 Flow 구조 (PH→광운대)

| 단계 | ID | 이름 | 타입 | 설명 |
|------|-----|------|------|------|
| 1 | step_1_collect_docs | 서류 수집 | form | 여권, 성적증명서, 재정증명 업로드 |
| 2 | step_2_verify_docs | 서류 검증 | process | 업로드된 서류 자동 검증 |
| 3 | step_3_college_select | 대학 선택 | form | 광운대 학과 선택 |
| 4 | step_4_program_select | 프로그램 선택 | form | 교환학생/학위 선택 |
| 5 | step_5_personal_info | 개인정보 입력 | form | 이름, 생년월일, 주소 |
| 6 | step_6_contact_verify | 연락처 검증 | process | 이메일/핸드폰 인증 |
| 7 | step_7_sop_upload | SOP 제출 | form | 학습 계획서 업로드 |
| 8 | step_8_sop_review | SOP 검토 | process | AI가 SOP 검토 및 점수 부여 |
| 9 | step_9_interview_book | 인터뷰 예약 | form | 면접 시간 선택 |
| 10 | step_10_interview | 면접 진행 | process | 실시간 면접 (Zoom 통합) |
| 11 | step_11_decision_wait | 결과 대기 | process | 입학사정 결과 대기 |
| 12 | step_12_enrollment | 등록 완료 | form | 최종 확인 및 등록 |

---

## 4️⃣ 변환 규칙 (매핑)

### Flow Step Type → Screen Type
```python
FLOW_TO_SCREEN_MAPPING = {
    "form": "form_screen",
    "process": "status_screen",
    "decision": "choice_screen",
    "payment": "payment_screen",
    "document": "document_screen"
}
```

### Component Type → Figma Component
```python
COMPONENT_TO_FIGMA = {
    "text_input": "TextField",
    "file_upload": "FileUpload",
    "dropdown": "Dropdown",
    "date_picker": "DatePicker",
    "button": "Button",
    "radio_group": "RadioGroup",
    "checkbox": "Checkbox",
    "text": "Text",
    "progress_bar": "ProgressBar"
}
```

---

## 5️⃣ 구현 클래스 (TypeScript)

### FlowToScreenMapper
```typescript
class FlowToScreenMapper {
  mapFlow(flow: Flow): ScreenModel {
    return {
      id: `${flow.id}_screens`,
      flow_id: flow.id,
      screens: flow.steps.map((step, index) => 
        this.mapStep(step, index + 1, flow.steps.length)
      )
    };
  }

  private mapStep(
    step: FlowStep, 
    stepNumber: number, 
    totalSteps: number
  ): Screen {
    return {
      id: `screen_${stepNumber}_${step.id}`,
      step_id: step.id,
      title: step.name,
      subtitle: `Step ${stepNumber}/${totalSteps}`,
      layout: this.inferLayout(step),
      components: this.mapComponents(step.fields || [])
    };
  }

  private mapComponents(fields: FlowField[]): Component[] {
    return fields.map(field => ({
      type: this.fieldTypeToComponent(field.type),
      id: field.id,
      label: field.name,
      required: field.required,
      validation: field.validation
    }));
  }
}
```

### ScreenToFigmaConverter
```typescript
class ScreenToFigmaConverter {
  convert(screen: Screen): FigmaFrame {
    const frame: FigmaFrame = {
      id: `figma_frame_${screen.id}`,
      type: "frame",
      name: screen.title,
      width: 360,
      height: 800,
      fill: COLORS.BACKGROUND,
      children: []
    };

    // Header with step counter
    frame.children.push(this.createHeader(screen));

    // Form components
    frame.children.push(
      ...screen.components.map(c => this.createFigmaComponent(c))
    );

    // Action buttons
    frame.children.push(this.createActionButtons(screen));

    return frame;
  }

  private createHeader(screen: Screen): FigmaGroup {
    return {
      type: "group",
      name: "Header",
      children: [
        {
          type: "text",
          content: `Step ${screen.step_number}/${screen.total_steps}`,
          fontSize: 14,
          fill: COLORS.SECONDARY_TEXT
        },
        {
          type: "text",
          content: screen.title,
          fontSize: 18,
          fontWeight: "700",
          fill: COLORS.PRIMARY_TEXT
        }
      ]
    };
  }
}
```

---

## 6️⃣ 테스트 기준선

### Input (Flow JSON)
```json
{
  "id": "ph_kr_kw",
  "steps": [
    {
      "id": "step_1_collect_docs",
      "name": "서류 수집",
      "type": "form",
      "fields": [{"id": "passport", "type": "file"}]
    }
  ]
}
```

### Expected Screen Output
```json
{
  "id": "ph_kr_kw_screens",
  "screens": [
    {
      "id": "screen_1_step_1_collect_docs",
      "step_id": "step_1_collect_docs",
      "title": "서류 수집",
      "subtitle": "Step 1/12"
    }
  ]
}
```

### Expected Figma Output
```json
{
  "id": "figma_frame_screen_1_step_1_collect_docs",
  "type": "frame",
  "name": "서류 수집 (Step 1/12)"
}
```

---

## 7️⃣ 파일 위치

```
kernel/
├── __init__.py
├── flow_mapper.py           (Flow → Screen)
├── screen_model.py          (Screen 데이터 모델)
├── figma_dsl.py            (Screen → Figma DSL)
├── figma_converter.py       (변환 로직)
└── models/
    ├── flow.py              (Flow 데이터 모델)
    └── screen.py            (Screen 데이터 모델)

tests/
└── fixtures/
    └── ph_kr_kw_flow_expected.json (테스트 기준선)

api/routes/
└── flow.py                  (Flow API 엔드포인트)
```

---

이 파이프라인이 완성되면:
- **Flow JSON** (프로세스) → **Screen Model** (UI) → **Figma DSL** (디자인)
- 자동으로 UI 프로토타입 생성 가능
- 기존 Figma 파일과 동기화 가능
