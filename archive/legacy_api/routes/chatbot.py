from fastapi import APIRouter, Request, Response
from typing import Dict, Any, List
import hashlib
import hmac
from datetime import datetime

router = APIRouter(prefix="/chatbot", tags=["WhatsApp/FB Chatbot"])

# Chatbot state storage
CONVERSATIONS: Dict[str, Dict] = {}
MESSAGE_QUEUE: List[Dict] = []

# Flow steps for chatbot
CHATBOT_FLOW = {
    "start": {
        "message": "👋 Welcome to LimePass!\n\nI'll help you check your eligibility for studying and working in Korea.\n\nReply with:\n1️⃣ Start Application\n2️⃣ Check Status\n3️⃣ Talk to Human",
        "options": {"1": "collect_name", "2": "check_status", "3": "human_handoff"}
    },
    "collect_name": {
        "message": "Great! Let's begin.\n\nWhat is your full name?",
        "field": "full_name",
        "next": "collect_email"
    },
    "collect_email": {
        "message": "Thanks {full_name}! 📧\n\nWhat is your email address?",
        "field": "email",
        "next": "collect_gpa"
    },
    "collect_gpa": {
        "message": "📚 What is your GPA? (out of 4.0 or 4.5)\n\nExample: 3.5",
        "field": "gpa",
        "validation": "number",
        "next": "collect_major"
    },
    "collect_major": {
        "message": "What was your undergraduate major?\n\nExample: Physical Education, Sports Science",
        "field": "major",
        "next": "collect_english"
    },
    "collect_english": {
        "message": "🗣️ Do you have an English test score?\n\n1️⃣ Yes, TOEIC\n2️⃣ Yes, IELTS\n3️⃣ No score yet",
        "options": {"1": "collect_toeic", "2": "collect_ielts", "3": "collect_savings"}
    },
    "collect_toeic": {
        "message": "What is your TOEIC score?\n\nExample: 750",
        "field": "english_score",
        "next": "collect_savings"
    },
    "collect_ielts": {
        "message": "What is your IELTS score?\n\nExample: 6.5",
        "field": "ielts_score",
        "next": "collect_savings"
    },
    "collect_savings": {
        "message": "💰 Approximately how much savings do you have available? (in USD)\n\nThis is needed for visa application.\n\nExample: 20000",
        "field": "savings_usd",
        "validation": "number",
        "next": "collect_experience"
    },
    "collect_experience": {
        "message": "🏃 How many years of sports-related experience do you have?\n\nExample: 2",
        "field": "experience_years",
        "validation": "number",
        "next": "calculate_score"
    },
    "calculate_score": {
        "message": "⏳ Calculating your eligibility score...",
        "action": "calculate",
        "next": "show_result"
    },
    "show_result": {
        "message": "🎉 Your LimePass Eligibility Score:\n\n📊 **{score}%**\n\n{recommendation}\n\n📋 Next Steps:\n{next_steps}\n\nReply:\n1️⃣ Start Full Application\n2️⃣ Talk to Advisor\n3️⃣ Learn More",
        "options": {"1": "full_application", "2": "human_handoff", "3": "learn_more"}
    },
    "check_status": {
        "message": "📱 Please enter your application ID or phone number:",
        "field": "lookup_id",
        "next": "show_status"
    },
    "human_handoff": {
        "message": "🙋 Connecting you with a LimePass advisor...\n\nOur team will contact you within 24 hours.\n\nYou can also:\n📧 Email: support@limepass.io\n📱 WhatsApp: +63-XXX-XXXX",
        "action": "handoff"
    }
}

def get_recommendation(score: int) -> tuple[str, str]:
    if score >= 80:
        return "✅ Excellent! You're highly eligible.", "1. Complete full application\n2. Prepare documents\n3. Schedule interview"
    elif score >= 60:
        return "👍 Good! You meet most requirements.", "1. Complete full application\n2. Consider improving English score\n3. Gather financial documents"
    elif score >= 40:
        return "⚠️ Potential candidate with some gaps.", "1. Improve English proficiency\n2. Gain more experience\n3. Increase savings if possible"
    else:
        return "❌ Some requirements not met.", "1. Focus on English improvement\n2. Consider scholarship options\n3. Talk to our advisor for guidance"

def calculate_quick_score(data: Dict) -> int:
    score = 0
    
    # GPA (max 25)
    gpa = float(data.get("gpa", 0))
    score += min(25, int(gpa / 4.0 * 25))
    
    # English (max 25)
    english = float(data.get("english_score", 0))
    if english >= 800:
        score += 25
    elif english >= 600:
        score += 20
    elif english >= 400:
        score += 10
    
    # Savings (max 25)
    savings = float(data.get("savings_usd", 0))
    if savings >= 25000:
        score += 25
    elif savings >= 20000:
        score += 20
    elif savings >= 15000:
        score += 10
    
    # Experience (max 25)
    exp = float(data.get("experience_years", 0))
    score += min(25, int(exp * 10))
    
    return min(100, score)

def process_message(user_id: str, message: str) -> str:
    """Process incoming message and return response"""
    
    # Get or create conversation state
    if user_id not in CONVERSATIONS:
        CONVERSATIONS[user_id] = {
            "state": "start",
            "data": {},
            "created_at": datetime.now().isoformat()
        }
    
    conv = CONVERSATIONS[user_id]
    current_state = conv["state"]
    step = CHATBOT_FLOW.get(current_state, CHATBOT_FLOW["start"])
    
    # Handle options
    if "options" in step:
        if message in step["options"]:
            conv["state"] = step["options"][message]
            next_step = CHATBOT_FLOW[conv["state"]]
            response = next_step["message"]
            
            # Replace placeholders
            for key, value in conv["data"].items():
                response = response.replace(f"{{{key}}}", str(value))
            
            return response
        else:
            return f"Please reply with a valid option:\n" + "\n".join([f"{k} - {v}" for k, v in step["options"].items()])
    
    # Handle field collection
    if "field" in step:
        # Validate if needed
        if step.get("validation") == "number":
            try:
                float(message)
            except:
                return "Please enter a valid number."
        
        conv["data"][step["field"]] = message
        
        # Move to next state
        if "next" in step:
            conv["state"] = step["next"]
            next_step = CHATBOT_FLOW[conv["state"]]
            
            # Handle calculate action
            if next_step.get("action") == "calculate":
                score = calculate_quick_score(conv["data"])
                conv["data"]["score"] = score
                rec, steps = get_recommendation(score)
                conv["data"]["recommendation"] = rec
                conv["data"]["next_steps"] = steps
                conv["state"] = next_step["next"]
                next_step = CHATBOT_FLOW[conv["state"]]
            
            response = next_step["message"]
            for key, value in conv["data"].items():
                response = response.replace(f"{{{key}}}", str(value))
            
            return response
    
    # Default: restart
    conv["state"] = "start"
    return CHATBOT_FLOW["start"]["message"]

# Meta Webhook Endpoints
@router.get("/webhook")
async def verify_webhook(request: Request):
    """Verify webhook for Meta"""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    VERIFY_TOKEN = "limepass_verify_token_2024"
    
    if mode == "subscribe" and token == VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    return {"error": "verification_failed"}

@router.post("/webhook")
async def receive_webhook(request: Request):
    """Receive messages from Meta"""
    body = await request.json()
    
    # Log incoming message
    MESSAGE_QUEUE.append({
        "received_at": datetime.now().isoformat(),
        "body": body
    })
    
    # Process WhatsApp message
    if "entry" in body:
        for entry in body["entry"]:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                messages = value.get("messages", [])
                
                for msg in messages:
                    user_id = msg.get("from")
                    text = msg.get("text", {}).get("body", "")
                    
                    if user_id and text:
                        response = process_message(user_id, text)
                        # In production: send via Meta API
                        # send_whatsapp_message(user_id, response)
    
    return {"status": "ok"}

@router.post("/simulate")
async def simulate_chat(data: Dict[str, Any]):
    """Simulate chatbot conversation"""
    user_id = data.get("user_id", "test_user")
    message = data.get("message", "")
    
    response = process_message(user_id, message)
    
    return {
        "user_id": user_id,
        "user_message": message,
        "bot_response": response,
        "conversation_state": CONVERSATIONS.get(user_id, {})
    }

@router.get("/conversations/{user_id}")
async def get_conversation(user_id: str):
    """Get conversation state"""
    if user_id not in CONVERSATIONS:
        return {"error": "conversation_not_found"}
    return CONVERSATIONS[user_id]

@router.delete("/conversations/{user_id}")
async def reset_conversation(user_id: str):
    """Reset conversation"""
    if user_id in CONVERSATIONS:
        del CONVERSATIONS[user_id]
    return {"status": "reset", "user_id": user_id}

@router.get("/stats")
async def chatbot_stats():
    """Chatbot statistics"""
    total = len(CONVERSATIONS)
    completed = len([c for c in CONVERSATIONS.values() if "score" in c.get("data", {})])
    
    return {
        "total_conversations": total,
        "completed_assessments": completed,
        "completion_rate": round(completed / total * 100, 1) if total > 0 else 0,
        "messages_received": len(MESSAGE_QUEUE)
    }
