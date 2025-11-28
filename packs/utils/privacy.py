import re

def mask_pii(text):
    # 이메일, 전화번호, 이름 일부 마스킹 예시
    text = re.sub(r'([\w.-]+)@([\w.-]+)', r'***@\2', text)
    text = re.sub(r'(\d{2,3})-(\d{3,4})-(\d{4})', r'***-****-\3', text)
    # 이름: 첫 글자(성)만 남기고 모두 * 처리 (예: 홍길동 -> 홍*)
    text = re.sub(r'([가-힣])[가-힣]+', r'\1*', text)
    return text
