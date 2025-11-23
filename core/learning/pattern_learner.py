"""
Pattern Learner - 사용자 패턴 학습
"""

import re
from typing import List, Dict, Optional
from datetime import datetime
from collections import Counter

from .base import (
    UserPattern,
    PatternType,
    LearningContext,
    ContentType,
    StyleProfile
)

class PatternLearner:
    """
    사용자 행동/스타일 패턴 학습
    """
    
    def __init__(self):
        self.patterns_cache: Dict[str, List[UserPattern]] = {}
    
    def learn_from_code(self, code: str) -> List[UserPattern]:
        """
        코드에서 패턴 학습
        """
        patterns = []
        
        # 1. 들여쓰기 스타일
        indent_pattern = self._detect_indent_style(code)
        if indent_pattern:
            patterns.append(indent_pattern)
        
        # 2. 네이밍 컨벤션
        naming_pattern = self._detect_naming_convention(code)
        if naming_pattern:
            patterns.append(naming_pattern)
        
        # 3. 주석 스타일
        comment_pattern = self._detect_comment_style(code)
        if comment_pattern:
            patterns.append(comment_pattern)
        
        # 4. 구조 선호도
        structure_pattern = self._detect_structure_preference(code)
        if structure_pattern:
            patterns.append(structure_pattern)
        
        return patterns
    
    def _detect_indent_style(self, code: str) -> Optional[UserPattern]:
        """들여쓰기 스타일 감지"""
        lines = code.split('\n')
        indents = []
        
        for line in lines:
            if line and line[0] in [' ', '\t']:
                # 앞의 공백 수 세기
                indent = len(line) - len(line.lstrip())
                if indent > 0:
                    indents.append(indent)
        
        if not indents:
            return None
        
        # 가장 흔한 들여쓰기
        indent_counter = Counter(indents)
        most_common = indent_counter.most_common(1)[0]
        indent_size = most_common[0]
        frequency = most_common[1]
        
        # 탭 vs 스페이스
        uses_tabs = '\t' in code
        
        confidence = min(0.9, frequency / len(indents))
        
        return UserPattern(
            pattern_type=PatternType.CODE_STYLE,
            pattern_data={
                'indent_size': indent_size,
                'uses_tabs': uses_tabs,
                'style': 'tabs' if uses_tabs else f'{indent_size} spaces'
            },
            confidence=confidence,
            frequency=frequency,
            last_seen=datetime.now(),
            examples=[f"Indent: {indent_size} {'tabs' if uses_tabs else 'spaces'}"]
        )
    
    def _detect_naming_convention(self, code: str) -> Optional[UserPattern]:
        """네이밍 컨벤션 감지"""
        # 함수명 추출
        function_names = re.findall(r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)', code)
        
        # 변수명 추출
        variable_names = re.findall(r'([a-z_][a-z0-9_]*)\s*=', code)
        
        all_names = function_names + variable_names
        
        if not all_names:
            return None
        
        # snake_case vs camelCase 판단
        snake_case_count = sum(1 for name in all_names if '_' in name)
        camel_case_count = sum(
            1 for name in all_names 
            if any(c.isupper() for c in name[1:]) and '_' not in name
        )
        
        total = len(all_names)
        
        if snake_case_count > camel_case_count:
            convention = 'snake_case'
            confidence = snake_case_count / total
        else:
            convention = 'camelCase'
            confidence = camel_case_count / total
        
        return UserPattern(
            pattern_type=PatternType.NAMING,
            pattern_data={
                'convention': convention,
                'snake_case_ratio': snake_case_count / total,
                'camel_case_ratio': camel_case_count / total
            },
            confidence=confidence,
            frequency=total,
            last_seen=datetime.now(),
            examples=all_names[:5]
        )
    
    def _detect_comment_style(self, code: str) -> Optional[UserPattern]:
        """주석 스타일 감지"""
        # 한줄 주석
        single_line = len(re.findall(r'#.*$', code, re.MULTILINE))
        
        # 독스트링
        docstrings = len(re.findall(r'""".*?"""', code, re.DOTALL))
        
        # 블록 주석
        block_comments = len(re.findall(r"'''.*?'''", code, re.DOTALL))
        
        total_comments = single_line + docstrings + block_comments
        
        if total_comments == 0:
            return None
        
        style_data = {
            'uses_single_line': single_line > 0,
            'uses_docstrings': docstrings > 0,
            'uses_block': block_comments > 0,
            'comment_frequency': total_comments / (code.count('\n') + 1)
        }
        
        # 선호 스타일
        if docstrings > single_line:
            preferred = 'docstrings'
            confidence = docstrings / total_comments
        else:
            preferred = 'single_line'
            confidence = single_line / total_comments
        
        return UserPattern(
            pattern_type=PatternType.COMMENT,
            pattern_data={
                **style_data,
                'preferred': preferred
            },
            confidence=confidence,
            frequency=total_comments,
            last_seen=datetime.now(),
            examples=[]
        )
    
    def _detect_structure_preference(self, code: str) -> Optional[UserPattern]:
        """구조 선호도 감지"""
        # 클래스 vs 함수
        class_count = len(re.findall(r'class\s+\w+', code))
        function_count = len(re.findall(r'def\s+\w+', code))
        
        # 리스트 컴프리헨션 사용
        list_comp = len(re.findall(r'\[.*for.*in.*\]', code))
        
        # 타입 힌트 사용
        type_hints = len(re.findall(r':\s*\w+(\[.*?\])?', code))
        
        if function_count == 0 and class_count == 0:
            return None
        
        structure_data = {
            'prefers_classes': class_count > function_count * 0.3,
            'uses_comprehensions': list_comp > 0,
            'uses_type_hints': type_hints > function_count * 0.5,
            'class_to_function_ratio': class_count / (function_count + 1)
        }
        
        confidence = 0.7  # 구조는 덜 확실
        
        return UserPattern(
            pattern_type=PatternType.STRUCTURE,
            pattern_data=structure_data,
            confidence=confidence,
            frequency=class_count + function_count,
            last_seen=datetime.now(),
            examples=[]
        )
    
    def learn_from_text(self, text: str) -> List[UserPattern]:
        """
        텍스트에서 패턴 학습
        """
        patterns = []
        
        # 언어 스타일 (한글 vs 영어)
        korean_ratio = len(re.findall(r'[가-힣]', text)) / len(text) if text else 0
        
        if korean_ratio > 0.3:
            patterns.append(UserPattern(
                pattern_type=PatternType.LANGUAGE,
                pattern_data={
                    'primary_language': 'korean',
                    'korean_ratio': korean_ratio
                },
                confidence=korean_ratio,
                frequency=1,
                last_seen=datetime.now(),
                examples=[]
            ))
        
        return patterns
    
    def update_profile(
        self, 
        profile: StyleProfile, 
        context: LearningContext
    ) -> StyleProfile:
        """
        프로필 업데이트
        """
        if context.content_type == ContentType.CODE:
            patterns = self.learn_from_code(context.content)
        else:
            patterns = self.learn_from_text(context.content)
        
        for pattern in patterns:
            profile.add_pattern(pattern)
        
        return profile
