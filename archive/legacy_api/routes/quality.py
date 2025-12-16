"""
Code Quality & Complexity Analysis API
=======================================

Real-time code analysis with complexity metrics, duplication detection, and refactoring suggestions

Endpoints:
  GET /api/v1/quality/scores - Module quality scores
  GET /api/v1/quality/duplicates - Duplicate code detection
  GET /api/v1/quality/metrics - Comprehensive quality metrics
  GET /api/v1/quality/suggestions - Refactoring suggestions
  GET /api/v1/quality/vs-code - VS Code integration data
"""

from fastapi import APIRouter, Query
from typing import Dict, List, Any, Optional
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime

router = APIRouter(prefix="/quality", tags=["Code Quality"])


class CodeQualityAnalyzer:
    """Analyze code quality, complexity, and duplication"""
    
    def __init__(self, root_path: str = "/Users/oseho/Desktop/autus"):
        self.root = Path(root_path)
        self.files: Dict[str, Dict[str, Any]] = {}
        self.duplicates: List[Dict[str, Any]] = []
        
    def analyze_complexity(self, content: str, filename: str) -> Dict[str, int]:
        """Calculate cyclomatic complexity"""
        
        # Count control flow statements
        decisions = len(re.findall(r'\bif\b|\belif\b|\belse\b|\bfor\b|\bwhile\b|\bexcept\b|\band\b|\bor\b', content))
        
        # Count functions and methods
        functions = len(re.findall(r'^\s*(?:async\s+)?def\s+\w+', content, re.MULTILINE))
        
        # Count classes
        classes = len(re.findall(r'^\s*class\s+\w+', content, re.MULTILINE))
        
        # Count lines
        lines = len(content.split('\n'))
        
        # Calculate metrics
        cyclomatic = decisions + functions
        
        return {
            'cyclomatic_complexity': cyclomatic,
            'functions': functions,
            'classes': classes,
            'total_lines': lines,
            'avg_function_lines': lines // (functions + 1),
            'nesting_depth': self.calculate_nesting_depth(content)
        }
    
    def calculate_nesting_depth(self, content: str) -> int:
        """Calculate maximum nesting depth"""
        max_depth = 0
        current_depth = 0
        
        for line in content.split('\n'):
            stripped = line.lstrip()
            if not stripped or stripped.startswith('#'):
                continue
            
            indent = len(line) - len(stripped)
            current_depth = indent // 4
            max_depth = max(max_depth, current_depth)
        
        return max_depth
    
    def analyze_style(self, content: str) -> Dict[str, Any]:
        """Check code style issues"""
        issues = []
        
        # Check line length
        for i, line in enumerate(content.split('\n'), 1):
            if len(line) > 100:
                issues.append(f'Line {i}: Too long ({len(line)} chars)')
        
        # Check for TODO/FIXME
        todos = re.findall(r'# (TODO|FIXME|BUG|HACK).*', content)
        if todos:
            issues.append(f'Found {len(todos)} TODOs/FIXMEs')
        
        # Check for unused imports (simplified)
        imports = re.findall(r'from\s+(\w+)\s+import|import\s+(\w+)', content)
        
        # Check for print statements (bad practice)
        prints = len(re.findall(r'\bprint\s*\(', content))
        if prints > 0:
            issues.append(f'Found {prints} print statements (use logging)')
        
        return {
            'style_issues': len(issues),
            'issues': issues[:10],
            'has_todos': len(todos) > 0,
            'todo_count': len(todos)
        }
    
    def detect_duplication(self) -> List[Dict[str, Any]]:
        """Detect duplicate code blocks"""
        python_files = list(self.root.rglob('*.py'))
        code_blocks: Dict[str, List[str]] = defaultdict(list)
        duplicates = []
        
        for filepath in python_files[:50]:  # Limit for performance
            if '.venv' in str(filepath) or '__pycache__' in str(filepath):
                continue
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract function definitions
                functions = re.findall(r'def\s+(\w+)\s*\([^)]*\):[^}]+?(?=\ndef|\nclass|\Z)', content, re.DOTALL)
                
                for func in functions[:5]:  # Check first 5 functions
                    # Simple block hashing
                    lines = func.split('\n')[:5]  # First 5 lines
                    block_hash = '\n'.join(lines)
                    code_blocks[block_hash].append(str(filepath))
            except:
                pass
        
        # Find duplicates
        for block, files in code_blocks.items():
            if len(files) > 1:
                duplicates.append({
                    'files': files,
                    'block': block[:50] + '...' if len(block) > 50 else block,
                    'occurrences': len(files)
                })
        
        return sorted(duplicates, key=lambda x: x['occurrences'], reverse=True)[:10]
    
    def analyze_all(self) -> None:
        """Analyze entire codebase"""
        python_files = list(self.root.rglob('*.py'))
        
        for filepath in python_files:
            if '.venv' in str(filepath) or '__pycache__' in str(filepath):
                continue
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                rel_path = str(filepath.relative_to(self.root))
                
                self.files[rel_path] = {
                    'complexity': self.analyze_complexity(content, rel_path),
                    'style': self.analyze_style(content),
                    'size': len(content)
                }
            except:
                pass
        
        self.duplicates = self.detect_duplication()
    
    def calculate_quality_score(self, metrics: Dict[str, Any]) -> int:
        """Calculate overall quality score (0-100)"""
        score = 100
        
        complexity = metrics.get('complexity', {})
        style = metrics.get('style', {})
        
        # Reduce score for high complexity
        if complexity.get('cyclomatic_complexity', 0) > 15:
            score -= 15
        elif complexity.get('cyclomatic_complexity', 0) > 10:
            score -= 10
        
        # Reduce for nesting depth
        if complexity.get('nesting_depth', 0) > 5:
            score -= 10
        elif complexity.get('nesting_depth', 0) > 3:
            score -= 5
        
        # Reduce for style issues
        score -= style.get('style_issues', 0) * 2
        
        return max(0, score)


analyzer = CodeQualityAnalyzer()


# ============================================================
# API ENDPOINTS
# ============================================================

@router.get("/scores")
async def get_quality_scores(
    sort_by: str = Query(default="quality", description="Sort by: quality, complexity, size"),
    limit: int = Query(default=30, le=100)
) -> Dict[str, Any]:
    """Get quality scores for all modules"""
    if not analyzer.files:
        analyzer.analyze_all()
    
    scores = []
    for filepath, metrics in analyzer.files.items():
        quality_score = analyzer.calculate_quality_score(metrics)
        scores.append({
            'file': filepath,
            'quality_score': quality_score,
            'complexity': metrics['complexity']['cyclomatic_complexity'],
            'nesting_depth': metrics['complexity']['nesting_depth'],
            'style_issues': metrics['style']['style_issues'],
            'size': metrics['size'],
            'grade': 'A' if quality_score >= 90 else 'B' if quality_score >= 80 else 'C' if quality_score >= 70 else 'D' if quality_score >= 60 else 'F'
        })
    
    # Sort
    if sort_by == 'complexity':
        scores.sort(key=lambda x: x['complexity'], reverse=True)
    elif sort_by == 'size':
        scores.sort(key=lambda x: x['size'], reverse=True)
    else:
        scores.sort(key=lambda x: x['quality_score'])
    
    # Calculate statistics
    avg_quality = sum(s['quality_score'] for s in scores) / len(scores) if scores else 0
    
    return {
        'total_files': len(scores),
        'average_quality': round(avg_quality, 1),
        'grade_distribution': {
            'A': len([s for s in scores if s['grade'] == 'A']),
            'B': len([s for s in scores if s['grade'] == 'B']),
            'C': len([s for s in scores if s['grade'] == 'C']),
            'D': len([s for s in scores if s['grade'] == 'D']),
            'F': len([s for s in scores if s['grade'] == 'F'])
        },
        'files': scores[:limit]
    }


@router.get("/duplicates")
async def get_duplicate_code() -> Dict[str, Any]:
    """Get duplicate code blocks"""
    if not analyzer.files:
        analyzer.analyze_all()
    
    return {
        'total_duplicates': len(analyzer.duplicates),
        'duplicates': analyzer.duplicates,
        'savings_potential': f'{len(analyzer.duplicates) * 5} lines of code could be consolidated'
    }


@router.get("/metrics")
async def get_comprehensive_metrics() -> Dict[str, Any]:
    """Get comprehensive code quality metrics"""
    if not analyzer.files:
        analyzer.analyze_all()
    
    metrics = {
        'total_files': len(analyzer.files),
        'total_lines': sum(m['size'] for m in analyzer.files.values()),
        'average_complexity': 0,
        'high_complexity_files': 0,
        'total_style_issues': 0
    }
    
    complexities = [m['complexity']['cyclomatic_complexity'] for m in analyzer.files.values()]
    if complexities:
        metrics['average_complexity'] = round(sum(complexities) / len(complexities), 2)
        metrics['high_complexity_files'] = len([c for c in complexities if c > 15])
    
    metrics['total_style_issues'] = sum(m['style']['style_issues'] for m in analyzer.files.values())
    
    # Quality grades
    all_scores = [analyzer.calculate_quality_score(m) for m in analyzer.files.values()]
    
    return {
        **metrics,
        'average_quality_score': round(sum(all_scores) / len(all_scores) if all_scores else 0, 1),
        'refactoring_urgency': 'HIGH' if metrics['high_complexity_files'] > len(analyzer.files) * 0.2 else 'MEDIUM' if metrics['high_complexity_files'] > len(analyzer.files) * 0.1 else 'LOW'
    }


@router.get("/suggestions")
async def get_refactoring_suggestions() -> Dict[str, Any]:
    """Get refactoring suggestions based on analysis"""
    if not analyzer.files:
        analyzer.analyze_all()
    
    suggestions = []
    
    # Find high complexity files
    for filepath, metrics in list(analyzer.files.items())[:10]:
        complexity = metrics['complexity']['cyclomatic_complexity']
        nesting = metrics['complexity']['nesting_depth']
        
        if complexity > 20:
            suggestions.append({
                'file': filepath,
                'type': 'REFACTOR',
                'priority': 'HIGH',
                'issue': f'High cyclomatic complexity: {complexity}',
                'suggestion': 'Break into smaller functions',
                'estimated_effort': '2-4 hours'
            })
        
        if nesting > 5:
            suggestions.append({
                'file': filepath,
                'type': 'REFACTOR',
                'priority': 'MEDIUM',
                'issue': f'Deep nesting: {nesting} levels',
                'suggestion': 'Extract nested logic into functions',
                'estimated_effort': '1-2 hours'
            })
    
    # Add duplication suggestions
    if analyzer.duplicates:
        suggestions.append({
            'type': 'CONSOLIDATE',
            'priority': 'MEDIUM',
            'issue': f'{len(analyzer.duplicates)} duplicate code blocks found',
            'suggestion': 'Extract common logic into shared utilities',
            'estimated_effort': '4-8 hours',
            'savings': f'~{len(analyzer.duplicates) * 5} lines of code'
        })
    
    return {
        'total_suggestions': len(suggestions),
        'suggestions': sorted(suggestions, key=lambda x: {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}.get(x.get('priority', 'LOW'))),
        'estimated_total_effort': f'{sum(2 for s in suggestions)} - {sum(4 for s in suggestions)} hours'
    }


@router.get("/vs-code")
async def get_quality_vscode_data() -> Dict[str, Any]:
    """Get data optimized for VS Code IDE integration"""
    if not analyzer.files:
        analyzer.analyze_all()
    
    low_quality_files = []
    for filepath, metrics in analyzer.files.items():
        score = analyzer.calculate_quality_score(metrics)
        if score < 70:
            low_quality_files.append({
                'file': filepath,
                'score': score,
                'issues': [
                    f"Complexity: {metrics['complexity']['cyclomatic_complexity']}",
                    f"Style issues: {metrics['style']['style_issues']}",
                    f"Nesting: {metrics['complexity']['nesting_depth']}"
                ]
            })
    
    return {
        'timestamp': datetime.now().isoformat(),
        'low_quality_files': sorted(low_quality_files, key=lambda x: x['score'])[:20],
        'quick_actions': [
            {'label': '📊 Quality Report', 'command': 'autus.qualityReport'},
            {'label': '🔴 Low Quality Files', 'command': 'autus.showLowQuality'},
            {'label': '🧹 Refactoring Tasks', 'command': 'autus.showRefactoring'},
            {'label': '📋 Duplicates', 'command': 'autus.showDuplicates'}
        ],
        'gutter_icons': {
            'high_complexity': {
                'files': [f for f, m in analyzer.files.items() if m['complexity']['cyclomatic_complexity'] > 15],
                'icon': '⚠️',
                'tooltip': 'High complexity function'
            },
            'low_quality': {
                'files': [f for f, m in analyzer.files.items() if analyzer.calculate_quality_score(m) < 60],
                'icon': '🔴',
                'tooltip': 'Low code quality'
            }
        }
    }
