"""
Personalizer - 개인화 적용
"""

from typing import Dict, Optional
from .base import StyleProfile, PersonalizationResult, PatternType

class Personalizer:
    """학습한 패턴을 바탕으로 프롬프트/응답 개인화"""
    
    def __init__(self):
        pass
    
    def personalize_code_prompt(self, original_prompt: str, profile: StyleProfile) -> PersonalizationResult:
        """코드 생성 프롬프트를 사용자 스타일에 맞게 개인화"""
        personalized = original_prompt
        applied_patterns = []
        reasoning_parts = []
        total_confidence = 0.0
        pattern_count = 0
        
        code_style = profile.get_pattern(PatternType.CODE_STYLE)
        if code_style:
            indent_size = code_style.pattern_data.get('indent_size', 4)
            uses_tabs = code_style.pattern_data.get('uses_tabs', False)
            
            if uses_tabs:
                personalized += "\n\nStyle: Use tabs for indentation."
            else:
                personalized += f"\n\nStyle: Use {indent_size}-space indentation."
            
            applied_patterns.append('indent_style')
            reasoning_parts.append(f"Applied {indent_size}-space indentation")
            total_confidence += code_style.confidence
            pattern_count += 1
        
        naming = profile.get_pattern(PatternType.NAMING)
        if naming:
            convention = naming.pattern_data.get('convention', 'snake_case')
            personalized += f"\nNaming: Use {convention} for variables and functions."
            
            applied_patterns.append('naming_convention')
            reasoning_parts.append(f"Applied {convention} naming")
            total_confidence += naming.confidence
            pattern_count += 1
        
        comment = profile.get_pattern(PatternType.COMMENT)
        if comment:
            preferred = comment.pattern_data.get('preferred', 'docstrings')
            if preferred == 'docstrings':
                personalized += "\nDocumentation: Include docstrings for functions."
            else:
                personalized += "\nDocumentation: Use inline comments."
            
            applied_patterns.append('comment_style')
            reasoning_parts.append(f"Applied {preferred} style")
            total_confidence += comment.confidence
            pattern_count += 1
        
        structure = profile.get_pattern(PatternType.STRUCTURE)
        if structure:
            uses_comprehensions = structure.pattern_data.get('uses_comprehensions', False)
            uses_type_hints = structure.pattern_data.get('uses_type_hints', False)
            
            if uses_comprehensions:
                personalized += "\nStyle: Prefer list comprehensions where appropriate."
                applied_patterns.append('comprehensions')
                reasoning_parts.append("User prefers comprehensions")
            
            if uses_type_hints:
                personalized += "\nType hints: Include type annotations."
                applied_patterns.append('type_hints')
                reasoning_parts.append("User uses type hints")
            
            total_confidence += structure.confidence
            pattern_count += 1
        
        avg_confidence = total_confidence / pattern_count if pattern_count > 0 else 0.5
        reasoning = "; ".join(reasoning_parts) if reasoning_parts else "No patterns applied"
        
        return PersonalizationResult(
            original_prompt=original_prompt,
            personalized_prompt=personalized,
            applied_patterns=applied_patterns,
            confidence=avg_confidence,
            reasoning=reasoning
        )
    
    def personalize_text_prompt(self, original_prompt: str, profile: StyleProfile) -> PersonalizationResult:
        """텍스트 생성 프롬프트를 개인화"""
        personalized = original_prompt
        applied_patterns = []
        reasoning_parts = []
        
        language = profile.get_pattern(PatternType.LANGUAGE)
        if language:
            primary_lang = language.pattern_data.get('primary_language')
            if primary_lang == 'korean':
                personalized += "\n\nLanguage: Respond in Korean when appropriate."
                applied_patterns.append('language_korean')
                reasoning_parts.append("User prefers Korean")
        
        confidence = 0.7 if applied_patterns else 0.5
        reasoning = "; ".join(reasoning_parts) if reasoning_parts else "No patterns applied"
        
        return PersonalizationResult(
            original_prompt=original_prompt,
            personalized_prompt=personalized,
            applied_patterns=applied_patterns,
            confidence=confidence,
            reasoning=reasoning
        )
    
    def apply_personalization(self, prompt: str, profile: StyleProfile, prompt_type: str = 'code') -> PersonalizationResult:
        """프롬프트 타입에 따라 개인화 적용"""
        if prompt_type == 'code':
            return self.personalize_code_prompt(prompt, profile)
        elif prompt_type == 'text':
            return self.personalize_text_prompt(prompt, profile)
        else:
            return PersonalizationResult(
                original_prompt=prompt,
                personalized_prompt=prompt,
                applied_patterns=[],
                confidence=0.5,
                reasoning="Unknown prompt type"
            )
