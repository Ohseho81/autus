"""
Style Analyzer - 스타일 분석 및 추천
"""

from typing import Dict, List, Optional
from .base import StyleProfile, PatternType, UserPattern

class StyleAnalyzer:
    """사용자 스타일 분석 및 코드/텍스트 스타일 추천"""
    
    def __init__(self):
        self.style_templates = self._load_style_templates()
    
    def _load_style_templates(self) -> Dict[str, Dict]:
        return {
            'code': {
                'professional': {
                    'indent': 4,
                    'naming': 'snake_case',
                    'comments': 'docstrings',
                    'type_hints': True
                },
                'compact': {
                    'indent': 2,
                    'naming': 'camelCase',
                    'comments': 'minimal',
                    'type_hints': False
                },
                'readable': {
                    'indent': 4,
                    'naming': 'snake_case',
                    'comments': 'inline',
                    'type_hints': True
                }
            }
        }
    
    def analyze_code_style(self, profile: StyleProfile) -> Dict[str, any]:
        analysis = {
            'detected_style': None,
            'recommendations': [],
            'confidence': 0.0,
            'characteristics': {}
        }
        
        code_style = profile.get_pattern(PatternType.CODE_STYLE)
        if code_style:
            indent_size = code_style.pattern_data.get('indent_size', 4)
            analysis['characteristics']['indent'] = indent_size
            analysis['confidence'] += code_style.confidence * 0.3
        
        naming = profile.get_pattern(PatternType.NAMING)
        if naming:
            convention = naming.pattern_data.get('convention', 'snake_case')
            analysis['characteristics']['naming'] = convention
            analysis['confidence'] += naming.confidence * 0.3
        
        structure = profile.get_pattern(PatternType.STRUCTURE)
        if structure:
            analysis['characteristics']['uses_comprehensions'] = structure.pattern_data.get('uses_comprehensions', False)
            analysis['characteristics']['uses_type_hints'] = structure.pattern_data.get('uses_type_hints', False)
            analysis['confidence'] += structure.confidence * 0.2
        
        comment = profile.get_pattern(PatternType.COMMENT)
        if comment:
            preferred = comment.pattern_data.get('preferred', 'single_line')
            analysis['characteristics']['comment_style'] = preferred
            analysis['confidence'] += comment.confidence * 0.2
        
        detected = self._match_style_template(analysis['characteristics'], 'code')
        if detected:
            analysis['detected_style'] = detected
            analysis['recommendations'] = self._generate_recommendations(analysis['characteristics'], detected)
        
        return analysis
    
    def _match_style_template(self, characteristics: Dict, domain: str) -> Optional[str]:
        templates = self.style_templates.get(domain, {})
        best_match = None
        best_score = 0.0
        
        for name, template in templates.items():
            score = 0.0
            total = 0
            
            for key, value in template.items():
                if key in characteristics:
                    total += 1
                    if characteristics[key] == value:
                        score += 1
            
            if total > 0:
                match_ratio = score / total
                if match_ratio > best_score:
                    best_score = match_ratio
                    best_match = name
        
        return best_match if best_score > 0.5 else None
    
    def _generate_recommendations(self, characteristics: Dict, style: str) -> List[str]:
        recommendations = []
        
        indent = characteristics.get('indent', 4)
        if indent == 2:
            recommendations.append("Consider using 4-space indentation for better readability")
        
        if not characteristics.get('uses_type_hints', False):
            recommendations.append("Add type hints for better code documentation")
        
        comment_style = characteristics.get('comment_style')
        if comment_style == 'single_line':
            recommendations.append("Consider using docstrings for function documentation")
        
        return recommendations
    
    def generate_style_guide(self, profile: StyleProfile) -> str:
        analysis = self.analyze_code_style(profile)
        
        guide = "# Your Personal Coding Style Guide\n\n"
        
        if analysis['detected_style']:
            guide += f"**Detected Style**: {analysis['detected_style']}\n\n"
        
        guide += "## Your Preferences\n\n"
        
        for key, value in analysis['characteristics'].items():
            guide += f"- **{key.replace('_', ' ').title()}**: {value}\n"
        
        if analysis['recommendations']:
            guide += "\n## Recommendations\n\n"
            for rec in analysis['recommendations']:
                guide += f"- {rec}\n"
        
        guide += f"\n**Confidence**: {analysis['confidence']:.2%}\n"
        
        return guide
