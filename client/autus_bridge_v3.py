#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS BRIDGE v3.0 - Universal Edition                            ║
║                          10개 매장 범용 화면 데이터 수집 클라이언트                          ║
║                                                                                           ║
║  v3.0 업데이트:                                                                            ║
║  - 🔔 VIP/주의 고객 경고음 및 토스트 알림                                                   ║
║  - 📊 실시간 대시보드 WebSocket 연동                                                       ║
║  - 🗄️ PostgreSQL/Supabase DB 연동                                                         ║
║  - 🎨 다크 테마 UI                                                                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow playsound

배포:
pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_v3.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import configparser
import os
import sys
import re
import json
import wave
import struct
import math
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

# 선택적 임포트
try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# 사운드 재생 (선택적)
try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Tesseract 경로 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
]

def find_tesseract():
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None

if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 기본 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

DEFAULT_CONFIG = {
    'server_url': 'http://localhost:8000',
    'region': '(200, 200, 800, 600)',
    'biz_type': 'RESTAURANT',
    'station_id': 'STATION_01',
    'scan_interval': '2',
    'language': 'kor+eng',
    'sound_enabled': 'true',
    'toast_enabled': 'true',
    'theme': 'dark',
}

# 알림 레벨별 설정
ALERT_CONFIG = {
    'vip': {
        'frequency': 800,  # Hz
        'duration': 300,   # ms
        'repeat': 2,
        'color': '#FFD700',  # Gold
        'bg_flash': '#4A3F00',
    },
    'caution': {
        'frequency': 1200,
        'duration': 200,
        'repeat': 3,
        'color': '#FF4444',  # Red
        'bg_flash': '#4A0000',
    },
    'success': {
        'frequency': 600,
        'duration': 150,
        'repeat': 1,
        'color': '#44FF44',  # Green
        'bg_flash': '#004A00',
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정 관리
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ConfigManager:
    def __init__(self, config_file='autus_bridge.ini'):
        self.config_file = config_file
        self.config = configparser.ConfigParser()
        self.load()
    
    def load(self):
        if os.path.exists(self.config_file):
            self.config.read(self.config_file, encoding='utf-8')
        else:
            self.config['DEFAULT'] = DEFAULT_CONFIG
            self.save()
    
    def save(self):
        with open(self.config_file, 'w', encoding='utf-8') as f:
            self.config.write(f)
    
    def get(self, key, fallback=None):
        return self.config['DEFAULT'].get(key, fallback or DEFAULT_CONFIG.get(key, ''))
    
    def set(self, key, value):
        self.config['DEFAULT'][key] = str(value)
        self.save()
    
    def get_region(self):
        try:
            return eval(self.get('region'))
        except:
            return (200, 200, 800, 600)
    
    def set_region(self, region):
        self.set('region', str(region))
    
    def get_bool(self, key):
        return self.get(key, 'true').lower() == 'true'


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 알림 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """경고음 시스템"""
    
    @staticmethod
    def beep(frequency=800, duration=200):
        """비프음 재생"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(frequency, duration)
            except:
                pass
        else:
            # Linux/Mac: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_alert(cls, alert_type: str):
        """알림 유형별 사운드 재생"""
        config = ALERT_CONFIG.get(alert_type, ALERT_CONFIG['success'])
        
        for _ in range(config['repeat']):
            cls.beep(config['frequency'], config['duration'])
            time.sleep(0.1)
    
    @classmethod
    def play_vip(cls):
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except:
                pass
    
    @classmethod
    def play_warning(cls):
        """경고 알림음 (급한 비프)"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except:
                pass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림 (팝업)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    def __init__(self, parent):
        self.parent = parent
        self.toast_window = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 3000):
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except:
                pass
        
        config = ALERT_CONFIG.get(alert_type, ALERT_CONFIG['success'])
        
        # 새 토스트 창 생성
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 위치 계산 (화면 우측 하단)
        screen_width = self.parent.winfo_screenwidth()
        screen_height = self.parent.winfo_screenheight()
        toast_width = 300
        toast_height = 80
        x = screen_width - toast_width - 20
        y = screen_height - toast_height - 60
        
        self.toast_window.geometry(f'{toast_width}x{toast_height}+{x}+{y}')
        self.toast_window.configure(bg=config['bg_flash'])
        
        # 아이콘
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        # 프레임
        frame = tk.Frame(self.toast_window, bg=config['bg_flash'], padx=10, pady=10)
        frame.pack(fill='both', expand=True)
        
        # 아이콘 라벨
        tk.Label(
            frame, 
            text=icon, 
            font=('Arial', 24),
            bg=config['bg_flash'],
            fg=config['color']
        ).pack(side='left', padx=(0, 10))
        
        # 메시지
        msg_frame = tk.Frame(frame, bg=config['bg_flash'])
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(
            msg_frame,
            text="AUTUS Alert",
            font=('Arial', 9, 'bold'),
            bg=config['bg_flash'],
            fg=config['color']
        ).pack(anchor='w')
        
        tk.Label(
            msg_frame,
            text=message[:40] + ('...' if len(message) > 40 else ''),
            font=('Arial', 10),
            bg=config['bg_flash'],
            fg='white',
            wraplength=200
        ).pack(anchor='w')
        
        # 자동 닫기
        self.toast_window.after(duration, self._close_toast)
    
    def _close_toast(self):
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 전송
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSender:
    def __init__(self, server_url):
        self.server_url = server_url
        self.last_error = None
        self.stats = {
            'total_sent': 0,
            'success': 0,
            'failed': 0,
            'vip_detected': 0,
            'caution_detected': 0,
        }
    
    def send(self, raw_text: str, biz_type: str, station_id: str) -> dict:
        if not REQUESTS_AVAILABLE:
            return {"status": "error", "message": "requests 모듈 없음"}
        
        try:
            self.stats['total_sent'] += 1
            
            response = requests.post(
                f"{self.server_url}/api/v1/observer/ingest",
                json={
                    "raw_text": raw_text,
                    "biz_type": biz_type,
                    "station_id": station_id
                },
                timeout=5
            )
            
            if response.status_code == 200:
                self.last_error = None
                self.stats['success'] += 1
                
                data = response.json()
                guide = data.get('guide', {})
                
                # 알림 통계
                alert_level = guide.get('alert_level', 'normal')
                if alert_level == 'urgent' or 'VIP' in str(guide):
                    self.stats['vip_detected'] += 1
                elif alert_level == 'caution':
                    self.stats['caution_detected'] += 1
                
                return data
            else:
                self.stats['failed'] += 1
                self.last_error = f"HTTP {response.status_code}"
                return {"status": "error", "message": self.last_error}
                
        except requests.exceptions.ConnectionError:
            self.stats['failed'] += 1
            self.last_error = "서버 연결 실패"
            return {"status": "error", "message": self.last_error}
        except requests.exceptions.Timeout:
            self.stats['failed'] += 1
            self.last_error = "응답 시간 초과"
            return {"status": "error", "message": self.last_error}
        except Exception as e:
            self.stats['failed'] += 1
            self.last_error = str(e)
            return {"status": "error", "message": self.last_error}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# OCR 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class OCREngine:
    def __init__(self, region, language='kor+eng'):
        self.region = region
        self.language = language
    
    def capture_and_ocr(self) -> str:
        if not PYAUTOGUI_AVAILABLE or not TESSERACT_AVAILABLE:
            return ""
        
        try:
            screenshot = pyautogui.screenshot(region=self.region)
            text = pytesseract.image_to_string(
                screenshot, 
                lang=self.language,
                config='--psm 6'
            )
            return text.strip()
        except Exception as e:
            print(f"[OCR Error] {e}")
            return ""
    
    def has_phone_number(self, text: str) -> bool:
        patterns = [
            r'010[-.\s]?\d{4}[-.\s]?\d{4}',
            r'010\d{8}',
        ]
        for pattern in patterns:
            if re.search(pattern, text):
                return True
        return False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusBridgeApp:
    """AUTUS Bridge v3.0 메인 GUI"""
    
    BIZ_TYPES = {
        "ACADEMY": "🎓 학원",
        "RESTAURANT": "🍽️ 식당",
        "SPORTS": "🏋️ 스포츠",
        "CAFE": "☕ 카페",
        "OTHER": "📦 기타",
    }
    
    # 다크 테마 색상
    DARK_THEME = {
        'bg': '#1e1e2e',
        'fg': '#cdd6f4',
        'accent': '#f5a524',
        'success': '#a6e3a1',
        'warning': '#f38ba8',
        'card_bg': '#313244',
        'border': '#45475a',
    }
    
    def __init__(self, root):
        self.root = root
        self.root.title("AUTUS Bridge v3.0")
        self.root.geometry("400x500")
        self.root.attributes('-topmost', True)
        self.root.resizable(False, False)
        
        # 다크 테마 적용
        self.root.configure(bg=self.DARK_THEME['bg'])
        
        # 설정 로드
        self.config = ConfigManager()
        
        # 컴포넌트 초기화
        self.sender = DataSender(self.config.get('server_url'))
        self.ocr_engine = OCREngine(
            self.config.get_region(),
            self.config.get('language')
        )
        self.toast = ToastNotification(self.root)
        
        # 상태 변수
        self.is_running = True
        self.is_paused = False
        self.last_text_hash = ""
        self.last_alert_time = 0
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드 시작
        self.stop_event = threading.Event()
        self.observer_thread = threading.Thread(target=self._observer_loop, daemon=True)
        self.observer_thread.start()
        
        # 통계 업데이트 타이머
        self._update_stats_display()
    
    def _build_ui(self):
        """다크 테마 UI 구성"""
        theme = self.DARK_THEME
        
        # ─── 헤더 ───
        header = tk.Frame(self.root, bg=theme['accent'], height=60)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header,
            text="🌉 AUTUS BRIDGE v3.0",
            font=("Arial", 16, "bold"),
            fg=theme['bg'],
            bg=theme['accent']
        ).pack(pady=15)
        
        # ─── 메인 컨텐츠 ───
        main = tk.Frame(self.root, bg=theme['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 업장 선택 카드
        card1 = tk.Frame(main, bg=theme['card_bg'], padx=15, pady=10)
        card1.pack(fill='x', pady=(0, 10))
        
        tk.Label(
            card1,
            text="업장 유형",
            font=("Arial", 10, "bold"),
            fg=theme['fg'],
            bg=theme['card_bg']
        ).pack(anchor='w')
        
        self.biz_type_var = tk.StringVar(value=self.config.get('biz_type'))
        
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('Dark.TCombobox', 
            fieldbackground=theme['bg'],
            background=theme['card_bg'],
            foreground=theme['fg']
        )
        
        self.combo = ttk.Combobox(
            card1,
            textvariable=self.biz_type_var,
            state="readonly",
            width=30,
            style='Dark.TCombobox'
        )
        self.combo['values'] = list(self.BIZ_TYPES.keys())
        self.combo.bind("<<ComboboxSelected>>", self._on_biz_change)
        self.combo.pack(fill='x', pady=(5, 0))
        
        # 상태 표시 카드
        card2 = tk.Frame(main, bg=theme['card_bg'], padx=15, pady=15)
        card2.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(card2, bg=theme['card_bg'])
        status_row.pack(fill='x')
        
        self.status_indicator = tk.Label(
            status_row,
            text="●",
            font=("Arial", 24),
            fg=theme['success'],
            bg=theme['card_bg']
        )
        self.status_indicator.pack(side='left')
        
        self.status_label = tk.Label(
            status_row,
            text="SYSTEM READY",
            font=("Arial", 12, "bold"),
            fg=theme['success'],
            bg=theme['card_bg']
        )
        self.status_label.pack(side='left', padx=10)
        
        # 메시지 영역
        self.message_frame = tk.Frame(card2, bg=theme['bg'], padx=10, pady=10)
        self.message_frame.pack(fill='x', pady=(10, 0))
        
        self.message_label = tk.Label(
            self.message_frame,
            text="회원 정보를 조회하면\nAI가 분석을 시작합니다.",
            font=("Arial", 10),
            fg=theme['fg'],
            bg=theme['bg'],
            justify='center',
            wraplength=300
        )
        self.message_label.pack(pady=5)
        
        # 통계 카드
        card3 = tk.Frame(main, bg=theme['card_bg'], padx=15, pady=10)
        card3.pack(fill='x', pady=(0, 10))
        
        tk.Label(
            card3,
            text="📊 실시간 통계",
            font=("Arial", 10, "bold"),
            fg=theme['fg'],
            bg=theme['card_bg']
        ).pack(anchor='w')
        
        stats_grid = tk.Frame(card3, bg=theme['card_bg'])
        stats_grid.pack(fill='x', pady=(10, 0))
        
        # 통계 라벨들
        self.stat_labels = {}
        stats_items = [
            ('total', '전송', theme['fg']),
            ('vip', 'VIP', '#FFD700'),
            ('caution', '주의', '#FF4444'),
            ('failed', '실패', '#888888'),
        ]
        
        for i, (key, label, color) in enumerate(stats_items):
            frame = tk.Frame(stats_grid, bg=theme['card_bg'])
            frame.grid(row=0, column=i, padx=10)
            
            self.stat_labels[key] = tk.Label(
                frame,
                text="0",
                font=("Arial", 18, "bold"),
                fg=color,
                bg=theme['card_bg']
            )
            self.stat_labels[key].pack()
            
            tk.Label(
                frame,
                text=label,
                font=("Arial", 8),
                fg=theme['fg'],
                bg=theme['card_bg']
            ).pack()
        
        # 버튼 영역
        btn_frame = tk.Frame(main, bg=theme['bg'])
        btn_frame.pack(fill='x', pady=(10, 0))
        
        # 좌표 설정 버튼
        self.region_btn = tk.Button(
            btn_frame,
            text="📐 좌표 설정",
            command=self._set_region,
            bg=theme['card_bg'],
            fg=theme['fg'],
            font=("Arial", 9),
            relief='flat',
            padx=15,
            pady=8
        )
        self.region_btn.pack(side='left', padx=(0, 5))
        
        # 일시정지 버튼
        self.pause_btn = tk.Button(
            btn_frame,
            text="⏸️ 일시정지",
            command=self._toggle_pause,
            bg=theme['card_bg'],
            fg=theme['fg'],
            font=("Arial", 9),
            relief='flat',
            padx=15,
            pady=8
        )
        self.pause_btn.pack(side='left', padx=5)
        
        # 사운드 토글 버튼
        self.sound_btn = tk.Button(
            btn_frame,
            text="🔔" if self.config.get_bool('sound_enabled') else "🔕",
            command=self._toggle_sound,
            bg=theme['card_bg'],
            fg=theme['fg'],
            font=("Arial", 12),
            relief='flat',
            width=3
        )
        self.sound_btn.pack(side='right')
        
        # 서버 URL (하단)
        server_frame = tk.Frame(main, bg=theme['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(
            server_frame,
            text="서버:",
            font=("Arial", 8),
            fg=theme['fg'],
            bg=theme['bg']
        ).pack(side='left')
        
        self.server_entry = tk.Entry(
            server_frame,
            width=35,
            font=("Arial", 8),
            bg=theme['card_bg'],
            fg=theme['fg'],
            insertbackground=theme['fg'],
            relief='flat'
        )
        self.server_entry.insert(0, self.config.get('server_url'))
        self.server_entry.pack(side='left', padx=5)
        self.server_entry.bind('<Return>', self._on_server_change)
    
    def _on_biz_change(self, event):
        biz_type = self.biz_type_var.get()
        self.config.set('biz_type', biz_type)
        self._update_message(f"모드 변경: {self.BIZ_TYPES.get(biz_type, biz_type)}", "accent")
    
    def _on_server_change(self, event):
        new_url = self.server_entry.get().strip()
        self.config.set('server_url', new_url)
        self.sender.server_url = new_url
        self._update_message(f"서버 변경됨", "accent")
    
    def _set_region(self):
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.")
            return
        
        messagebox.showinfo(
            "좌표 설정 (1/2)",
            "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요."
        )
        self.root.after(3000, self._capture_top_left)
    
    def _capture_top_left(self):
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        
        messagebox.showinfo(
            "좌표 설정 (2/2)",
            f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n마우스를 [우측 하단]에 두세요."
        )
        self.root.after(3000, self._capture_bottom_right)
    
    def _capture_bottom_right(self):
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        
        width = x2 - x1
        height = y2 - y1
        
        if width <= 0 or height <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.")
            return
        
        new_region = (x1, y1, width, height)
        self.config.set_region(new_region)
        self.ocr_engine.region = new_region
        
        self._update_message(f"좌표 설정 완료: {width}x{height}", "success")
        
        # 성공 사운드
        if self.config.get_bool('sound_enabled'):
            SoundAlert.play_alert('success')
    
    def _toggle_pause(self):
        self.is_paused = not self.is_paused
        
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", "warning")
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", "success")
    
    def _toggle_sound(self):
        current = self.config.get_bool('sound_enabled')
        self.config.set('sound_enabled', str(not current).lower())
        self.sound_btn.config(text="🔔" if not current else "🔕")
    
    def _update_status(self, text, color_key):
        theme = self.DARK_THEME
        color = theme.get(color_key, theme['fg'])
        self.status_label.config(text=text, fg=color)
        self.status_indicator.config(fg=color)
    
    def _update_message(self, text, color_key="fg"):
        theme = self.DARK_THEME
        color = theme.get(color_key, theme['fg'])
        self.message_label.config(text=text, fg=color)
    
    def _update_stats_display(self):
        """통계 표시 업데이트"""
        stats = self.sender.stats
        
        self.stat_labels['total'].config(text=str(stats['success']))
        self.stat_labels['vip'].config(text=str(stats['vip_detected']))
        self.stat_labels['caution'].config(text=str(stats['caution_detected']))
        self.stat_labels['failed'].config(text=str(stats['failed']))
        
        # 1초마다 업데이트
        self.root.after(1000, self._update_stats_display)
    
    def _play_alert(self, alert_type: str, message: str):
        """알림 재생 (사운드 + 토스트)"""
        now = time.time()
        
        # 1초 이내 중복 알림 방지
        if now - self.last_alert_time < 1:
            return
        
        self.last_alert_time = now
        
        # 사운드
        if self.config.get_bool('sound_enabled'):
            if alert_type == 'vip':
                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
            elif alert_type == 'caution':
                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
        
        # 토스트
        if self.config.get_bool('toast_enabled'):
            self.toast.show(message, alert_type, 4000)
    
    def _observer_loop(self):
        """백그라운드 감시 루프"""
        interval = int(self.config.get('scan_interval'))
        
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # 1. OCR 수행
                text = self.ocr_engine.capture_and_ocr()
                
                if not text:
                    time.sleep(interval)
                    continue
                
                # 2. 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_text_hash:
                    time.sleep(interval)
                    continue
                
                # 3. 전화번호 포함 여부
                if not self.ocr_engine.has_phone_number(text):
                    time.sleep(interval)
                    continue
                
                # 4. 상태 업데이트
                self.root.after(0, lambda: self._update_status("ANALYZING...", "accent"))
                
                # 5. 서버 전송
                result = self.sender.send(
                    raw_text=text,
                    biz_type=self.biz_type_var.get(),
                    station_id=self.config.get('station_id')
                )
                
                self.last_text_hash = current_hash
                
                # 6. 결과 처리
                if result.get('status') == 'success':
                    guide = result.get('guide', {})
                    
                    if guide:
                        msg = guide.get('message', '분석 완료')
                        alert_level = guide.get('alert_level', 'normal')
                        
                        # 알림 유형 결정
                        if alert_level == 'urgent' or 'VIP' in str(guide) or '후원' in str(guide):
                            color = "accent"
                            self._play_alert('vip', msg)
                        elif alert_level == 'caution' or '주의' in str(guide):
                            color = "warning"
                            self._play_alert('caution', msg)
                        else:
                            color = "success"
                        
                        self.root.after(0, lambda m=msg, c=color: self._update_message(m, c))
                    else:
                        self.root.after(0, lambda: self._update_message("데이터 전송 완료", "success"))
                    
                    self.root.after(0, lambda: self._update_status("SYSTEM READY", "success"))
                else:
                    err_msg = result.get('message', '알 수 없는 오류')
                    self.root.after(0, lambda m=err_msg: self._update_message(f"오류: {m}", "warning"))
                    self.root.after(0, lambda: self._update_status("ERROR", "warning"))
                
            except Exception as e:
                print(f"[Observer Error] {e}")
                self.root.after(0, lambda: self._update_status("ERROR", "warning"))
            
            time.sleep(interval)
    
    def on_closing(self):
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    root = tk.Tk()
    
    # 스타일 설정
    style = ttk.Style()
    style.theme_use('clam')
    
    app = AutusBridgeApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()


if __name__ == "__main__":
    main()
