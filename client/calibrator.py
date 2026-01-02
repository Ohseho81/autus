#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS Calibrator: 좌표 조준기                                     ║
║                          설치 시 1회 실행하여 감시 영역 설정                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

사용법:
1. python calibrator.py 실행
2. 안내에 따라 감시 영역의 좌측 상단 → 우측 하단 순서로 마우스 이동
3. 출력된 좌표를 AUTUS Bridge 설정에 입력

주의:
- Tesseract-OCR이 설치되어 있어야 OCR 테스트 가능
- 매니저 프로그램(POS, LMS 등)이 띄워진 상태에서 실행
"""

import time
import sys
import os
import configparser

try:
    import pyautogui
except ImportError:
    print("Error: pyautogui가 설치되지 않았습니다.")
    print("설치: pip install pyautogui")
    sys.exit(1)

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
    
    # Tesseract 경로 설정
    tesseract_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        '/usr/bin/tesseract',
        '/usr/local/bin/tesseract',
    ]
    
    for path in tesseract_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break
except ImportError:
    TESSERACT_AVAILABLE = False


CONFIG_FILE = 'autus_bridge_config.ini'


def print_header():
    """헤더 출력"""
    print("\n" + "=" * 60)
    print("     🎯 AUTUS Calibrator (좌표 조준기) v1.0")
    print("     감시 영역 설정 도구")
    print("=" * 60)


def get_coordinates():
    """마우스 좌표 캡처"""
    print("\n📍 좌표 캡처를 시작합니다.")
    print("-" * 60)
    
    # Step 1: 좌측 상단
    print("\n[Step 1/2] 좌측 상단 좌표 캡처")
    print("  → 매니저 프로그램을 띄우고, 감시할 영역의 [왼쪽 위 모서리]에")
    print("    마우스를 올려두세요.")
    input("  → 준비되면 Enter를 누르세요...")
    
    print("  → 3초 후 좌표를 캡처합니다...")
    for i in range(3, 0, -1):
        print(f"    {i}...", end=" ", flush=True)
        time.sleep(1)
    print()
    
    x1, y1 = pyautogui.position()
    print(f"  ✓ 좌측 상단 좌표: ({x1}, {y1})")
    
    # Step 2: 우측 하단
    print("\n[Step 2/2] 우측 하단 좌표 캡처")
    print("  → 이제 감시할 영역의 [오른쪽 아래 모서리]에")
    print("    마우스를 올려두세요.")
    input("  → 준비되면 Enter를 누르세요...")
    
    print("  → 3초 후 좌표를 캡처합니다...")
    for i in range(3, 0, -1):
        print(f"    {i}...", end=" ", flush=True)
        time.sleep(1)
    print()
    
    x2, y2 = pyautogui.position()
    print(f"  ✓ 우측 하단 좌표: ({x2}, {y2})")
    
    # 계산
    width = x2 - x1
    height = y2 - y1
    
    if width <= 0 or height <= 0:
        print("\n❌ 오류: 좌표가 잘못되었습니다. 다시 시도하세요.")
        return None
    
    region = (x1, y1, width, height)
    return region


def test_capture(region):
    """캡처 및 OCR 테스트"""
    print("\n🔍 캡처 테스트 중...")
    
    try:
        screenshot = pyautogui.screenshot(region=region)
        print(f"  ✓ 스크린샷 캡처 성공: {screenshot.size}")
        
        # 미리보기 저장
        preview_path = "calibration_preview.png"
        screenshot.save(preview_path)
        print(f"  → 미리보기 저장: {preview_path}")
        
        # OCR 테스트
        if TESSERACT_AVAILABLE:
            print("\n📝 OCR 테스트 중...")
            text = pytesseract.image_to_string(screenshot, lang='kor+eng')
            
            print(f"  ✓ 추출된 텍스트 ({len(text)}자):")
            print("-" * 40)
            print(text[:500] + "..." if len(text) > 500 else text)
            print("-" * 40)
            
            # 전화번호 검색
            import re
            phones = re.findall(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text)
            if phones:
                print(f"\n  📞 발견된 전화번호: {phones}")
            else:
                print("\n  ⚠️ 전화번호가 발견되지 않았습니다.")
                print("     → 올바른 영역을 선택했는지 확인하세요.")
        else:
            print("\n  ⚠️ Tesseract가 설치되지 않아 OCR 테스트를 건너뜁니다.")
            print("     → Tesseract 설치: https://github.com/UB-Mannheim/tesseract/wiki")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
        return False


def save_config(region):
    """설정 파일에 저장"""
    config = configparser.ConfigParser()
    
    # 기존 설정 로드
    if os.path.exists(CONFIG_FILE):
        config.read(CONFIG_FILE, encoding='utf-8')
    
    if 'DEFAULT' not in config:
        config['DEFAULT'] = {}
    
    config['DEFAULT']['Region'] = str(region)
    
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        config.write(f)
    
    print(f"\n💾 설정 저장 완료: {CONFIG_FILE}")


def main():
    """메인 함수"""
    print_header()
    
    print("\n⚠️ 주의사항:")
    print("  1. 매니저 프로그램(POS, LMS 등)을 먼저 띄워주세요.")
    print("  2. 감시할 영역(회원 정보 창 등)이 보이는 상태여야 합니다.")
    print("  3. 마우스를 정확한 위치에 올려두세요.")
    
    proceed = input("\n준비가 되었으면 Enter, 취소하려면 'q' 입력: ")
    if proceed.lower() == 'q':
        print("취소되었습니다.")
        return
    
    # 좌표 캡처
    region = get_coordinates()
    if not region:
        return
    
    print("\n" + "=" * 60)
    print(f"  📐 캡처 영역: {region}")
    print(f"     (x={region[0]}, y={region[1]}, w={region[2]}, h={region[3]})")
    print("=" * 60)
    
    # 테스트
    test_input = input("\n캡처 테스트를 진행하시겠습니까? (y/n): ")
    if test_input.lower() == 'y':
        test_capture(region)
    
    # 저장
    save_input = input("\n이 설정을 저장하시겠습니까? (y/n): ")
    if save_input.lower() == 'y':
        save_config(region)
        print("\n✅ 완료! AUTUS Bridge를 실행하면 자동으로 이 영역을 감시합니다.")
    else:
        print("\n설정이 저장되지 않았습니다.")
        print(f"수동 설정: REGION = {region}")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
