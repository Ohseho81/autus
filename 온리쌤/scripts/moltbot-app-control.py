"""
═══════════════════════════════════════════════════════════════════════════════
🤖 몰트봇 앱 컨트롤 모듈
═══════════════════════════════════════════════════════════════════════════════

버튼 클릭 → Supabase 업데이트 → 앱 즉시 반영

사용법:
1. 텔레그램에서 /앱설정 입력
2. 버튼 메뉴 표시
3. 원하는 버튼 클릭
4. 앱 자동 반영

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from supabase import create_client

# ═══════════════════════════════════════════════════════════════════════════════
# Supabase 연결
# ═══════════════════════════════════════════════════════════════════════════════

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pphzvnaedmzcvpxjulti.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ═══════════════════════════════════════════════════════════════════════════════
# 버튼 메뉴 정의
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# Mini App URL (Supabase Storage에 업로드 후 URL 변경)
# ═══════════════════════════════════════════════════════════════════════════════
MINI_APP_URL = "https://pphzvnaedmzcvpxjulti.supabase.co/storage/v1/object/public/app-assets/admin/app-config.html"

MAIN_MENU = [
    # 🏆 Mini App 버튼 (한 번에 모든 설정)
    [
        InlineKeyboardButton(
            "⚡ 설정 패널 열기", 
            web_app={"url": MINI_APP_URL}
        ),
    ],
    # 빠른 설정 버튼들
    [
        InlineKeyboardButton("🎨 테마 변경", callback_data="menu_theme"),
        InlineKeyboardButton("📝 문구 변경", callback_data="menu_labels"),
    ],
    [
        InlineKeyboardButton("🔘 기능 ON/OFF", callback_data="menu_features"),
        InlineKeyboardButton("🏠 홈 화면", callback_data="menu_home"),
    ],
    [
        InlineKeyboardButton("📊 현재 설정 보기", callback_data="view_config"),
    ],
]

THEME_MENU = [
    [
        InlineKeyboardButton("🟠 오렌지 (기본)", callback_data="theme_orange"),
        InlineKeyboardButton("🔵 블루", callback_data="theme_blue"),
    ],
    [
        InlineKeyboardButton("🟢 그린", callback_data="theme_green"),
        InlineKeyboardButton("🟣 퍼플", callback_data="theme_purple"),
    ],
    [InlineKeyboardButton("← 뒤로", callback_data="back_main")],
]

LABELS_MENU = [
    [
        InlineKeyboardButton("코치님 → 선생님", callback_data="label_coach_teacher"),
        InlineKeyboardButton("선생님 → 코치님", callback_data="label_coach_coach"),
    ],
    [
        InlineKeyboardButton("감사 → 후원", callback_data="label_gratitude_support"),
        InlineKeyboardButton("후원 → 감사", callback_data="label_gratitude_thanks"),
    ],
    [InlineKeyboardButton("← 뒤로", callback_data="back_main")],
]

FEATURES_MENU = [
    [
        InlineKeyboardButton("💝 감사 기능", callback_data="toggle_gratitude"),
        InlineKeyboardButton("🛒 노하우 마켓", callback_data="toggle_market"),
    ],
    [
        InlineKeyboardButton("💜 궁합 분석", callback_data="toggle_compatibility"),
    ],
    [InlineKeyboardButton("← 뒤로", callback_data="back_main")],
]

HOME_MENU = [
    [
        InlineKeyboardButton("인사말: 감동을 만들어요", callback_data="home_greeting_1"),
    ],
    [
        InlineKeyboardButton("인사말: 화이팅!", callback_data="home_greeting_2"),
    ],
    [
        InlineKeyboardButton("인사말: 좋은 하루!", callback_data="home_greeting_3"),
    ],
    [InlineKeyboardButton("← 뒤로", callback_data="back_main")],
]

# ═══════════════════════════════════════════════════════════════════════════════
# 설정 업데이트 함수
# ═══════════════════════════════════════════════════════════════════════════════

def update_config(key: str, value: dict, updated_by: str = "moltbot"):
    """Supabase app_config 업데이트"""
    try:
        supabase.table("app_config").upsert({
            "key": key,
            "value": json.dumps(value),
            "updated_by": updated_by
        }).execute()
        return True
    except Exception as e:
        print(f"Error updating config: {e}")
        return False

def get_config(key: str) -> dict:
    """현재 설정값 조회"""
    try:
        result = supabase.table("app_config").select("value").eq("key", key).single().execute()
        return json.loads(result.data["value"]) if result.data else {}
    except:
        return {}

# ═══════════════════════════════════════════════════════════════════════════════
# 핸들러
# ═══════════════════════════════════════════════════════════════════════════════

async def app_settings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/앱설정 명령어 핸들러"""
    keyboard = InlineKeyboardMarkup(MAIN_MENU)
    await update.message.reply_text(
        "🏀 **올댓바스켓 앱 설정**\n\n버튼을 눌러 앱을 수정하세요.\n변경사항은 즉시 반영됩니다.",
        reply_markup=keyboard,
        parse_mode="Markdown"
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """버튼 클릭 핸들러"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    # 메뉴 이동
    if data == "menu_theme":
        await query.edit_message_text("🎨 **테마 선택**\n\n앱 메인 색상을 변경합니다.", 
            reply_markup=InlineKeyboardMarkup(THEME_MENU), parse_mode="Markdown")
    
    elif data == "menu_labels":
        await query.edit_message_text("📝 **문구 변경**\n\n앱 내 텍스트를 변경합니다.",
            reply_markup=InlineKeyboardMarkup(LABELS_MENU), parse_mode="Markdown")
    
    elif data == "menu_features":
        features = get_config("features")
        status = []
        status.append(f"💝 감사: {'ON' if features.get('show_gratitude', True) else 'OFF'}")
        status.append(f"🛒 마켓: {'ON' if features.get('show_market', True) else 'OFF'}")
        status.append(f"💜 궁합: {'ON' if features.get('show_compatibility', True) else 'OFF'}")
        await query.edit_message_text(f"🔘 **기능 ON/OFF**\n\n현재 상태:\n" + "\n".join(status),
            reply_markup=InlineKeyboardMarkup(FEATURES_MENU), parse_mode="Markdown")
    
    elif data == "menu_home":
        await query.edit_message_text("🏠 **홈 화면 설정**\n\n인사말을 변경합니다.",
            reply_markup=InlineKeyboardMarkup(HOME_MENU), parse_mode="Markdown")
    
    elif data == "back_main":
        await query.edit_message_text("🏀 **올댓바스켓 앱 설정**\n\n버튼을 눌러 앱을 수정하세요.",
            reply_markup=InlineKeyboardMarkup(MAIN_MENU), parse_mode="Markdown")
    
    # 테마 변경
    elif data.startswith("theme_"):
        color_map = {
            "theme_orange": {"primary": "#FF6B2C", "name": "오렌지"},
            "theme_blue": {"primary": "#007AFF", "name": "블루"},
            "theme_green": {"primary": "#30D158", "name": "그린"},
            "theme_purple": {"primary": "#BF5AF2", "name": "퍼플"},
        }
        theme = color_map.get(data, color_map["theme_orange"])
        update_config("theme", {"primary": theme["primary"], "background": "#000000", "card": "#1C1C1E"})
        await query.edit_message_text(f"✅ 테마가 **{theme['name']}**으로 변경되었습니다!\n\n앱을 다시 시작하면 적용됩니다.",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("← 메인 메뉴", callback_data="back_main")]]),
            parse_mode="Markdown")
    
    # 라벨 변경
    elif data.startswith("label_"):
        labels = get_config("labels")
        if data == "label_coach_teacher":
            labels["coach"] = "선생님"
        elif data == "label_coach_coach":
            labels["coach"] = "코치님"
        elif data == "label_gratitude_support":
            labels["gratitude"] = "후원"
        elif data == "label_gratitude_thanks":
            labels["gratitude"] = "감사"
        update_config("labels", labels)
        await query.edit_message_text(f"✅ 문구가 변경되었습니다!\n\n앱을 다시 시작하면 적용됩니다.",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("← 메인 메뉴", callback_data="back_main")]]),
            parse_mode="Markdown")
    
    # 기능 토글
    elif data.startswith("toggle_"):
        features = get_config("features")
        if data == "toggle_gratitude":
            features["show_gratitude"] = not features.get("show_gratitude", True)
            status = "ON" if features["show_gratitude"] else "OFF"
            await query.answer(f"💝 감사 기능: {status}")
        elif data == "toggle_market":
            features["show_market"] = not features.get("show_market", True)
            status = "ON" if features["show_market"] else "OFF"
            await query.answer(f"🛒 노하우 마켓: {status}")
        elif data == "toggle_compatibility":
            features["show_compatibility"] = not features.get("show_compatibility", True)
            status = "ON" if features["show_compatibility"] else "OFF"
            await query.answer(f"💜 궁합 분석: {status}")
        update_config("features", features)
        # 메뉴 새로고침
        status_list = []
        status_list.append(f"💝 감사: {'ON' if features.get('show_gratitude', True) else 'OFF'}")
        status_list.append(f"🛒 마켓: {'ON' if features.get('show_market', True) else 'OFF'}")
        status_list.append(f"💜 궁합: {'ON' if features.get('show_compatibility', True) else 'OFF'}")
        await query.edit_message_text(f"🔘 **기능 ON/OFF**\n\n현재 상태:\n" + "\n".join(status_list),
            reply_markup=InlineKeyboardMarkup(FEATURES_MENU), parse_mode="Markdown")
    
    # 홈 인사말
    elif data.startswith("home_greeting_"):
        greetings = {
            "home_greeting_1": "오늘도 감동을 만들어 보세요.",
            "home_greeting_2": "오늘도 화이팅!",
            "home_greeting_3": "좋은 하루 되세요!",
        }
        text = greetings.get(data, greetings["home_greeting_1"])
        update_config("home_greeting", {"text": text, "emoji": "🏀"})
        await query.edit_message_text(f"✅ 인사말이 변경되었습니다!\n\n\"{text}\"\n\n앱을 다시 시작하면 적용됩니다.",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("← 메인 메뉴", callback_data="back_main")]]),
            parse_mode="Markdown")
    
    # 현재 설정 보기
    elif data == "view_config":
        theme = get_config("theme")
        labels = get_config("labels")
        features = get_config("features")
        home = get_config("home_greeting")
        
        text = "📊 **현재 앱 설정**\n\n"
        text += f"🎨 테마: {theme.get('primary', '#FF6B2C')}\n"
        text += f"👤 호칭: {labels.get('coach', '코치님')}\n"
        text += f"💝 감사 탭명: {labels.get('gratitude', '감사')}\n"
        text += f"🏠 인사말: {home.get('text', '오늘도 감동을 만들어 보세요.')}\n"
        text += f"\n기능 상태:\n"
        text += f"- 감사: {'✅' if features.get('show_gratitude', True) else '❌'}\n"
        text += f"- 마켓: {'✅' if features.get('show_market', True) else '❌'}\n"
        text += f"- 궁합: {'✅' if features.get('show_compatibility', True) else '❌'}"
        
        await query.edit_message_text(text,
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("← 메인 메뉴", callback_data="back_main")]]),
            parse_mode="Markdown")

# ═══════════════════════════════════════════════════════════════════════════════
# 봇 등록 (기존 몰트봇에 추가)
# ═══════════════════════════════════════════════════════════════════════════════

def register_app_control(application: Application):
    """기존 몰트봇에 앱 컨트롤 기능 추가"""
    application.add_handler(CommandHandler("앱설정", app_settings))
    application.add_handler(CommandHandler("app", app_settings))
    application.add_handler(CallbackQueryHandler(button_callback))
    print("✅ 앱 컨트롤 모듈 등록 완료")

# 단독 실행 시
if __name__ == "__main__":
    import asyncio
    
    BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    
    if not BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN 환경변수를 설정하세요")
        exit(1)
    
    app = Application.builder().token(BOT_TOKEN).build()
    register_app_control(app)
    
    print("🤖 몰트봇 앱 컨트롤 시작...")
    app.run_polling()
