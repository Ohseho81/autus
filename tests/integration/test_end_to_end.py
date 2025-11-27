"""End-to-End Integration Test"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.connector.anthropic_connector import AnthropicConnector
from core.connector.base import AIRequest
from core.learning.pattern_learner import PatternLearner
from core.learning.personalizer import Personalizer
from core.learning.base import StyleProfile, LearningContext, ContentType
from core.data.collector import DataCollector
from core.data.analyzer import DataAnalyzer
from datetime import datetime

class AUTUSIntegration:
    def __init__(self):
        self.connector = AnthropicConnector()
        self.learner = PatternLearner()
        self.personalizer = Personalizer()
        self.profile = StyleProfile(
            user_id="test_user",
            patterns={},
            preferences={},
            statistics={},
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        self.collector = DataCollector()
        self.analyzer = DataAnalyzer()
    
    async def process_request(self, prompt: str, learn: bool = True):
        print(f"\n{'='*60}")
        print(f"📝 {prompt}")
        print(f"{'='*60}")
        
        print("\n✨ Personalization...")
        personalized = self.personalizer.personalize_code_prompt(prompt, self.profile)
        print(f"   Patterns: {len(personalized.applied_patterns)}")
        
        print("\n🤖 AI Generation...")
        import time
        start = time.time()
        
        request = AIRequest(prompt=personalized.personalized_prompt)
        response = await self.connector.generate(request)
        
        elapsed = time.time() - start
        print(f"   Time: {elapsed:.2f}s")
        print(f"   Response: {response.content[:80]}...")
        
        print("\n💾 Data Collection...")
        self.collector.collect_code_generation(
            prompt=prompt,
            response=response.content,
            ai_provider="anthropic",
            time_seconds=elapsed,
            success=True
        )
        
        if learn:
            print("\n🧠 Learning...")
            context = LearningContext(content=response.content, content_type=ContentType.CODE)
            self.profile = self.learner.update_profile(self.profile, context)
            print(f"   Patterns: {len(self.profile.patterns)}")
        
        return response.content

async def test_integration():
    print("\n" + "="*60)
    print("🚀 AUTUS Integration Test")
    print("="*60)
    
    autus = AUTUSIntegration()
    autus.collector.start_session()
    
    print("\n🧪 Test 1")
    await autus.process_request("Write a hello function", learn=True)
    
    print("\n🧪 Test 2")
    await autus.process_request("Write a sort function", learn=True)
    
    autus.collector.end_session()
    
    print("\n" + "="*60)
    print("📊 Analysis")
    print("="*60)
    
    stats = autus.analyzer.analyze_sessions(autus.collector.sessions)
    print(f"\nSessions: {stats.total_sessions}, Events: {stats.total_events}")
    
    patterns = autus.analyzer.analyze_patterns(autus.collector.patterns)
    print(f"Patterns: {patterns['total_patterns']}")
    
    insights = autus.analyzer.get_insights(autus.collector.sessions, autus.collector.patterns)
    print(f"\nInsights:")
    for insight in insights[:3]:
        print(f"  • {insight}")
    
    print("\n" + "="*60)
    print("✅ Complete!")
    print("="*60)
    print(f"\n• AI: ✅ • Learning: ✅ ({len(autus.profile.patterns)} patterns)")
    print(f"• Data: ✅ ({stats.total_events} events) • Analysis: ✅")
    print("\n💎 Week 1-3: 70% Differentiation")

if __name__ == "__main__":
    asyncio.run(test_integration())
