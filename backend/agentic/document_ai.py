"""
Document Understanding (AI Vision)
==================================

Gemini Vision API를 사용한 문서 처리

AA IQ Bot / UiPath Document Understanding 스타일:
- OCR + Layout 분석
- 키-값 추출
- 테이블 추출
- 분류 및 검증

Phase 2 목표: 비정형 문서 → 구조화된 데이터
"""

import asyncio
import base64
import httpx
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel
from pathlib import Path
import json
import os


class ExtractedField(BaseModel):
    """추출된 필드"""
    name: str
    value: str
    confidence: float
    bounding_box: Optional[Dict[str, float]] = None


class ExtractedTable(BaseModel):
    """추출된 테이블"""
    headers: List[str]
    rows: List[List[str]]
    confidence: float


class DocumentResult(BaseModel):
    """문서 처리 결과"""
    document_type: str
    confidence: float
    fields: List[ExtractedField]
    tables: List[ExtractedTable]
    raw_text: str
    processing_time_ms: int
    suggestions: List[Dict[str, Any]]


class DocumentUnderstanding:
    """
    AI 문서 이해 엔진
    
    Usage:
        doc_ai = DocumentUnderstanding(api_key="...")
        
        # 이미지/PDF 처리
        result = await doc_ai.process_document("invoice.pdf")
        
        # 특정 필드 추출
        fields = await doc_ai.extract_fields(image_bytes, ["invoice_number", "total"])
        
        # 문서 분류
        doc_type = await doc_ai.classify_document(image_bytes)
    """
    
    # 지원 문서 유형
    DOCUMENT_TYPES = {
        "invoice": {
            "fields": ["invoice_number", "date", "vendor", "total", "tax", "line_items"],
            "icon": "🧾"
        },
        "receipt": {
            "fields": ["store_name", "date", "items", "subtotal", "tax", "total"],
            "icon": "🧾"
        },
        "contract": {
            "fields": ["parties", "effective_date", "terms", "signatures"],
            "icon": "📜"
        },
        "form": {
            "fields": ["form_type", "filled_fields", "checkboxes", "signatures"],
            "icon": "📝"
        },
        "id_document": {
            "fields": ["name", "id_number", "date_of_birth", "expiry_date"],
            "icon": "🪪"
        }
    }
    
    def __init__(
        self,
        api_key: str = None,
        model: str = "gemini-1.5-flash"
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model
        self._client = httpx.AsyncClient(timeout=60.0)
        self._base_url = "https://generativelanguage.googleapis.com/v1beta"
    
    # ═══════════════════════════════════════════════════════════════
    # Image/PDF Processing
    # ═══════════════════════════════════════════════════════════════
    
    def _encode_image(self, image_path: Union[str, Path]) -> str:
        """이미지를 base64로 인코딩"""
        with open(image_path, "rb") as f:
            return base64.standard_b64encode(f.read()).decode("utf-8")
    
    def _get_mime_type(self, file_path: Union[str, Path]) -> str:
        """파일 MIME 타입 추출"""
        path = Path(file_path)
        extension = path.suffix.lower()
        
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".pdf": "application/pdf"
        }
        
        return mime_types.get(extension, "application/octet-stream")
    
    # ═══════════════════════════════════════════════════════════════
    # Gemini Vision API
    # ═══════════════════════════════════════════════════════════════
    
    async def _call_gemini_vision(
        self,
        image_data: str,
        mime_type: str,
        prompt: str
    ) -> str:
        """Gemini Vision API 호출"""
        url = f"{self._base_url}/models/{self.model}:generateContent"
        
        payload = {
            "contents": [{
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": image_data
                        }
                    },
                    {
                        "text": prompt
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 4096
            }
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = await self._client.post(
            f"{url}?key={self.api_key}",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        
        result = response.json()
        
        # 응답에서 텍스트 추출
        try:
            return result["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            return ""
    
    # ═══════════════════════════════════════════════════════════════
    # Document Classification
    # ═══════════════════════════════════════════════════════════════
    
    async def classify_document(
        self,
        image_path: Union[str, Path] = None,
        image_data: str = None,
        mime_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        문서 유형 분류
        
        Returns:
            {"type": "invoice", "confidence": 0.95}
        """
        if image_path:
            image_data = self._encode_image(image_path)
            mime_type = self._get_mime_type(image_path)
        
        prompt = """Analyze this document image and classify it into one of these types:
        - invoice: Business invoice or bill
        - receipt: Store receipt or transaction record
        - contract: Legal agreement or contract
        - form: Filled form or application
        - id_document: ID card, passport, license
        - other: Other document type
        
        Respond in JSON format:
        {"type": "invoice", "confidence": 0.95, "reason": "..."}
        """
        
        response = await self._call_gemini_vision(image_data, mime_type, prompt)
        
        try:
            # JSON 파싱 시도
            result = json.loads(response.strip().replace("```json", "").replace("```", ""))
            return result
        except json.JSONDecodeError:
            # 파싱 실패 시 기본값
            return {"type": "other", "confidence": 0.5, "reason": "Could not classify"}
    
    # ═══════════════════════════════════════════════════════════════
    # Field Extraction
    # ═══════════════════════════════════════════════════════════════
    
    async def extract_fields(
        self,
        image_path: Union[str, Path] = None,
        image_data: str = None,
        mime_type: str = "image/jpeg",
        fields: List[str] = None,
        document_type: str = None
    ) -> List[ExtractedField]:
        """
        문서에서 특정 필드 추출
        """
        if image_path:
            image_data = self._encode_image(image_path)
            mime_type = self._get_mime_type(image_path)
        
        # 문서 타입에 따른 기본 필드
        if not fields and document_type and document_type in self.DOCUMENT_TYPES:
            fields = self.DOCUMENT_TYPES[document_type]["fields"]
        elif not fields:
            fields = ["title", "date", "amount", "name"]
        
        prompt = f"""Extract the following fields from this document image:
        Fields to extract: {', '.join(fields)}
        
        For each field found, provide:
        - name: field name
        - value: extracted value
        - confidence: 0.0 to 1.0
        
        Respond in JSON array format:
        [{{"name": "invoice_number", "value": "INV-001", "confidence": 0.95}}]
        
        If a field is not found, omit it from the response.
        """
        
        response = await self._call_gemini_vision(image_data, mime_type, prompt)
        
        try:
            results = json.loads(response.strip().replace("```json", "").replace("```", ""))
            return [ExtractedField(**item) for item in results]
        except (json.JSONDecodeError, TypeError):
            return []
    
    # ═══════════════════════════════════════════════════════════════
    # Table Extraction
    # ═══════════════════════════════════════════════════════════════
    
    async def extract_tables(
        self,
        image_path: Union[str, Path] = None,
        image_data: str = None,
        mime_type: str = "image/jpeg"
    ) -> List[ExtractedTable]:
        """문서에서 테이블 추출"""
        if image_path:
            image_data = self._encode_image(image_path)
            mime_type = self._get_mime_type(image_path)
        
        prompt = """Extract all tables from this document image.
        
        For each table, provide:
        - headers: list of column headers
        - rows: 2D array of cell values
        - confidence: 0.0 to 1.0
        
        Respond in JSON array format:
        [{"headers": ["Item", "Qty", "Price"], "rows": [["Widget", "5", "$10.00"]], "confidence": 0.9}]
        
        If no tables found, return empty array: []
        """
        
        response = await self._call_gemini_vision(image_data, mime_type, prompt)
        
        try:
            results = json.loads(response.strip().replace("```json", "").replace("```", ""))
            return [ExtractedTable(**item) for item in results]
        except (json.JSONDecodeError, TypeError):
            return []
    
    # ═══════════════════════════════════════════════════════════════
    # Full Document Processing
    # ═══════════════════════════════════════════════════════════════
    
    async def process_document(
        self,
        image_path: Union[str, Path] = None,
        image_data: str = None,
        mime_type: str = "image/jpeg"
    ) -> DocumentResult:
        """
        문서 전체 처리
        
        1. 문서 분류
        2. 필드 추출
        3. 테이블 추출
        4. AUTUS 제안 생성
        """
        start_time = datetime.now()
        
        if image_path:
            image_data = self._encode_image(image_path)
            mime_type = self._get_mime_type(image_path)
        
        # 1. 분류
        classification = await self.classify_document(image_data=image_data, mime_type=mime_type)
        doc_type = classification.get("type", "other")
        
        # 2. 필드 추출
        fields = await self.extract_fields(
            image_data=image_data,
            mime_type=mime_type,
            document_type=doc_type
        )
        
        # 3. 테이블 추출
        tables = await self.extract_tables(image_data=image_data, mime_type=mime_type)
        
        # 4. OCR (전체 텍스트)
        raw_text = await self._extract_raw_text(image_data, mime_type)
        
        # 처리 시간
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # 5. AUTUS 제안 생성
        suggestions = self._generate_suggestions(doc_type, fields, tables)
        
        return DocumentResult(
            document_type=doc_type,
            confidence=classification.get("confidence", 0.5),
            fields=fields,
            tables=tables,
            raw_text=raw_text,
            processing_time_ms=processing_time,
            suggestions=suggestions
        )
    
    async def _extract_raw_text(self, image_data: str, mime_type: str) -> str:
        """문서 전체 텍스트 추출"""
        prompt = "Extract all text from this document image. Preserve the layout as much as possible."
        return await self._call_gemini_vision(image_data, mime_type, prompt)
    
    def _generate_suggestions(
        self,
        doc_type: str,
        fields: List[ExtractedField],
        tables: List[ExtractedTable]
    ) -> List[Dict[str, Any]]:
        """AUTUS AI Suggestion 생성"""
        suggestions = []
        
        # 문서 타입별 제안
        if doc_type == "invoice":
            # 중복 인보이스 체크 제안
            invoice_num = next((f.value for f in fields if "invoice" in f.name.lower()), None)
            if invoice_num:
                suggestions.append({
                    "type": "merge",
                    "title": f"Check for duplicate invoice: {invoice_num}",
                    "confidence": 85,
                    "reason": "Consider checking if this invoice was already processed",
                    "action": "search_duplicates"
                })
            
            # 자동 승인 제안
            total = next((f for f in fields if "total" in f.name.lower()), None)
            if total and total.confidence > 0.9:
                suggestions.append({
                    "type": "automate",
                    "title": "Auto-approve invoice",
                    "confidence": 92,
                    "reason": f"High confidence extraction ({total.confidence:.0%}). Consider auto-approval workflow.",
                    "action": "auto_approve"
                })
        
        elif doc_type == "receipt":
            # 경비 보고서 자동 생성
            suggestions.append({
                "type": "automate",
                "title": "Generate expense report",
                "confidence": 88,
                "reason": "Receipt detected. Auto-generate expense entry.",
                "action": "create_expense"
            })
        
        elif doc_type == "contract":
            # 계약 리뷰 알림
            suggestions.append({
                "type": "alert",
                "title": "Contract requires legal review",
                "confidence": 90,
                "reason": "Contract document detected. Route to legal team.",
                "action": "route_legal"
            })
        
        # 테이블이 있으면 데이터 임포트 제안
        if tables:
            suggestions.append({
                "type": "automate",
                "title": f"Import {len(tables)} table(s) to system",
                "confidence": 80,
                "reason": f"Found {sum(len(t.rows) for t in tables)} rows of data. Import to ERP/database.",
                "action": "import_data"
            })
        
        return suggestions
    
    # ═══════════════════════════════════════════════════════════════
    # AUTUS Integration
    # ═══════════════════════════════════════════════════════════════
    
    def convert_to_autus_task(self, result: DocumentResult) -> Dict[str, Any]:
        """
        DocumentResult → AUTUS Task Node 변환
        """
        doc_info = self.DOCUMENT_TYPES.get(result.document_type, {"icon": "📄", "fields": []})
        
        return {
            "source": "document_ai",
            "type": result.document_type,
            "icon": doc_info["icon"],
            "name": f"{result.document_type.title()}: {result.fields[0].value if result.fields else 'Unknown'}",
            "meta": f"{len(result.fields)} fields, {len(result.tables)} tables extracted",
            "timestamp": datetime.now().isoformat(),
            "priority": "normal",
            "automation": int(result.confidence * 100),
            "k_value": 3.0 + result.confidence,
            "data": {
                "fields": [{"name": f.name, "value": f.value} for f in result.fields],
                "table_count": len(result.tables),
                "processing_time_ms": result.processing_time_ms
            },
            "suggestions": result.suggestions
        }
    
    async def close(self):
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════
# Quick Test Function
# ═══════════════════════════════════════════════════════════════

async def test_document_understanding():
    """테스트 함수 (API 키 필요)"""
    doc_ai = DocumentUnderstanding()
    
    # 테스트용 가짜 결과 (실제로는 이미지 필요)
    result = DocumentResult(
        document_type="invoice",
        confidence=0.95,
        fields=[
            ExtractedField(name="invoice_number", value="INV-2024-001", confidence=0.98),
            ExtractedField(name="total", value="$1,234.56", confidence=0.96),
            ExtractedField(name="date", value="2024-01-15", confidence=0.94)
        ],
        tables=[
            ExtractedTable(
                headers=["Item", "Qty", "Price"],
                rows=[["Widget A", "10", "$50.00"], ["Widget B", "5", "$100.00"]],
                confidence=0.92
            )
        ],
        raw_text="Invoice #INV-2024-001...",
        processing_time_ms=1234,
        suggestions=[]
    )
    
    task = doc_ai.convert_to_autus_task(result)
    print(json.dumps(task, indent=2))
    
    await doc_ai.close()


if __name__ == "__main__":
    asyncio.run(test_document_understanding())
