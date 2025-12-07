"""
VS Code IDE Integration Protocol
=================================

Autus integrates with VS Code through:
1. REST API endpoints for code analysis
2. CodeLens for inline metrics and actions
3. Decorations for file complexity indicators  
4. Quick Pick for fast navigation
5. Status bar for real-time insights

To integrate with VS Code extension, use the data from /api/v1/*/vs-code endpoints
"""

from fastapi import APIRouter, Query
from typing import Dict, List, Any
from datetime import datetime

router = APIRouter(prefix="/vscode", tags=["VS Code IDE"])


@router.get("/quick-actions")
async def get_quick_actions() -> Dict[str, Any]:
    """Get all available quick actions for VS Code Quick Pick (Cmd+K)"""
    return {
        'timestamp': datetime.now().isoformat(),
        'categories': {
            'Architecture': [
                {
                    'label': '📊 Architecture Graph',
                    'command': 'autus.architecture.graph',
                    'endpoint': '/api/v1/architecture/graph',
                    'description': 'View module dependency DAG'
                },
                {
                    'label': '🔴 Complexity Hotspots',
                    'command': 'autus.architecture.hotspots',
                    'endpoint': '/api/v1/architecture/hotspots',
                    'description': 'Find high-complexity modules'
                },
                {
                    'label': '⚡ Impact Analysis',
                    'command': 'autus.architecture.impact',
                    'endpoint': '/api/v1/architecture/impact',
                    'description': 'Analyze change impact'
                },
                {
                    'label': '❤️ Architecture Health',
                    'command': 'autus.architecture.health',
                    'endpoint': '/api/v1/architecture/health',
                    'description': 'Check architecture metrics'
                }
            ],
            'Code Quality': [
                {
                    'label': '📊 Quality Report',
                    'command': 'autus.quality.report',
                    'endpoint': '/api/v1/quality/scores',
                    'description': 'View code quality scores'
                },
                {
                    'label': '🔴 Low Quality Files',
                    'command': 'autus.quality.low',
                    'endpoint': '/api/v1/quality/scores',
                    'description': 'See files needing refactoring'
                },
                {
                    'label': '🧹 Refactoring Tasks',
                    'command': 'autus.quality.refactor',
                    'endpoint': '/api/v1/quality/suggestions',
                    'description': 'Get refactoring suggestions'
                },
                {
                    'label': '📋 Duplicate Code',
                    'command': 'autus.quality.duplicates',
                    'endpoint': '/api/v1/quality/duplicates',
                    'description': 'Find duplicate code blocks'
                }
            ],
            'Team': [
                {
                    'label': '👥 Team Activity',
                    'command': 'autus.team.activity',
                    'endpoint': '/api/v1/team/activity',
                    'description': 'View team activity'
                },
                {
                    'label': '🔥 Active Hotspots',
                    'command': 'autus.team.hotspots',
                    'endpoint': '/api/v1/team/hotspots',
                    'description': 'Files being actively changed'
                },
                {
                    'label': '⚠️ Merge Conflicts',
                    'command': 'autus.team.conflicts',
                    'endpoint': '/api/v1/team/conflicts',
                    'description': 'Potential merge conflicts'
                },
                {
                    'label': '📊 Team Dashboard',
                    'command': 'autus.team.dashboard',
                    'endpoint': '/api/v1/team/dashboard',
                    'description': 'Complete team metrics'
                }
            ],
            'Monitoring': [
                {
                    'label': '📊 Live Monitoring',
                    'command': 'autus.monitoring.dashboard',
                    'endpoint': '/api/v1/monitoring/dashboard',
                    'description': 'Real-time API metrics'
                },
                {
                    'label': '⚡ Slow Endpoints',
                    'command': 'autus.monitoring.slow',
                    'endpoint': '/api/v1/monitoring/slow',
                    'description': 'Slowest API endpoints'
                },
                {
                    'label': '❌ Error Endpoints',
                    'command': 'autus.monitoring.errors',
                    'endpoint': '/api/v1/monitoring/errors',
                    'description': 'Endpoints with errors'
                }
            ]
        }
    }


@router.get("/codelens")
async def get_codelens_data() -> Dict[str, Any]:
    """Get CodeLens data for inline metrics display"""
    return {
        'timestamp': datetime.now().isoformat(),
        'lens_providers': [
            {
                'selector': '*.py',
                'command': 'autus.showComplexity',
                'title': 'Complexity',
                'endpoint': '/api/v1/architecture/modules',
                'display': 'Show complexity score for this file'
            },
            {
                'selector': '*.py',
                'command': 'autus.showQuality',
                'title': 'Quality',
                'endpoint': '/api/v1/quality/scores',
                'display': 'Show code quality grade'
            },
            {
                'selector': '*.py',
                'command': 'autus.showImpact',
                'title': 'Impact',
                'endpoint': '/api/v1/architecture/impact',
                'display': 'Show change impact analysis'
            }
        ]
    }


@router.get("/decorations")
async def get_file_decorations() -> Dict[str, Any]:
    """Get file decoration providers for visual indicators"""
    return {
        'timestamp': datetime.now().isoformat(),
        'providers': [
            {
                'id': 'complexity-decorator',
                'glob': '**/*.py',
                'rules': [
                    {
                        'name': 'High Complexity',
                        'color': 'rgba(255, 0, 0, 0.5)',
                        'icon': '⚠️',
                        'tooltip': 'High cyclomatic complexity',
                        'condition': 'complexity > 20'
                    },
                    {
                        'name': 'Medium Complexity',
                        'color': 'rgba(255, 165, 0, 0.5)',
                        'icon': '⚡',
                        'tooltip': 'Medium complexity',
                        'condition': 'complexity > 10'
                    },
                    {
                        'name': 'High Dependencies',
                        'color': 'rgba(255, 0, 0, 0.3)',
                        'icon': '🔴',
                        'tooltip': 'Many dependencies',
                        'condition': 'dependencies > 10'
                    }
                ]
            },
            {
                'id': 'hotspot-decorator',
                'glob': '**/*.py',
                'rules': [
                    {
                        'name': 'Recently Changed',
                        'color': 'rgba(255, 200, 0, 0.3)',
                        'icon': '🔥',
                        'tooltip': 'Actively being changed',
                        'condition': 'last_changed < 7d'
                    },
                    {
                        'name': 'Merge Conflict Risk',
                        'color': 'rgba(255, 0, 0, 0.5)',
                        'icon': '⚠️',
                        'tooltip': 'Potential merge conflict',
                        'condition': 'conflict_risk == HIGH'
                    }
                ]
            }
        ]
    }


@router.get("/status-bar")
async def get_status_bar_items() -> Dict[str, Any]:
    """Get status bar items for VS Code bottom bar"""
    return {
        'timestamp': datetime.now().isoformat(),
        'items': [
            {
                'id': 'autus-status',
                'alignment': 'right',
                'priority': 100,
                'command': 'autus.showDashboard',
                'text': '$(rocket) AUTUS',
                'tooltip': 'Click to open AUTUS Dashboard',
                'color': '#00d4ff'
            },
            {
                'id': 'team-activity',
                'alignment': 'right',
                'priority': 90,
                'command': 'autus.team.activity',
                'text': '$(organization) Team: 3 active',
                'tooltip': 'View team activity',
                'endpoint': '/api/v1/team/contributors'
            },
            {
                'id': 'quality-score',
                'alignment': 'right',
                'priority': 80,
                'command': 'autus.quality.report',
                'text': '$(star) Quality: 82%',
                'tooltip': 'View code quality metrics',
                'endpoint': '/api/v1/quality/scores'
            },
            {
                'id': 'health-check',
                'alignment': 'right',
                'priority': 70,
                'command': 'autus.monitoring.health',
                'text': '$(heart) System: Healthy',
                'tooltip': 'View system health',
                'endpoint': '/api/v1/architecture/health'
            }
        ]
    }


@router.get("/tree-view")
async def get_tree_view_data() -> Dict[str, Any]:
    """Get data for custom Tree View providers"""
    return {
        'timestamp': datetime.now().isoformat(),
        'views': [
            {
                'id': 'architecture-view',
                'name': 'AUTUS Architecture',
                'icon': 'package',
                'type': 'tree',
                'commands': [
                    {'id': 'show-graph', 'title': 'Show Dependency Graph'},
                    {'id': 'show-hotspots', 'title': 'Show Hotspots'},
                    {'id': 'analyze-impact', 'title': 'Analyze Impact'}
                ]
            },
            {
                'id': 'quality-view',
                'name': 'AUTUS Quality',
                'icon': 'beaker',
                'type': 'tree',
                'commands': [
                    {'id': 'quality-report', 'title': 'Quality Report'},
                    {'id': 'hotspots', 'title': 'Complexity Hotspots'},
                    {'id': 'duplicates', 'title': 'Duplicate Code'}
                ]
            },
            {
                'id': 'team-view',
                'name': 'AUTUS Team',
                'icon': 'organization',
                'type': 'tree',
                'commands': [
                    {'id': 'activity', 'title': 'Team Activity'},
                    {'id': 'hotspots', 'title': 'Active Hotspots'},
                    {'id': 'conflicts', 'title': 'Merge Conflicts'}
                ]
            }
        ]
    }


@router.get("/webview-panels")
async def get_webview_panels() -> Dict[str, Any]:
    """Get Webview panel configurations for custom UIs"""
    return {
        'timestamp': datetime.now().isoformat(),
        'panels': [
            {
                'id': 'architecture-graph-panel',
                'title': 'Architecture Graph',
                'viewType': 'autus.architectureGraph',
                'icon': 'package',
                'endpoint': '/api/v1/architecture/graph/svg',
                'description': 'Interactive dependency DAG visualization'
            },
            {
                'id': 'quality-dashboard-panel',
                'title': 'Code Quality Dashboard',
                'viewType': 'autus.qualityDashboard',
                'icon': 'beaker',
                'endpoint': '/api/v1/quality/scores',
                'description': 'Real-time code quality metrics'
            },
            {
                'id': 'team-dashboard-panel',
                'title': 'Team Dashboard',
                'viewType': 'autus.teamDashboard',
                'icon': 'organization',
                'endpoint': '/api/v1/team/dashboard',
                'description': 'Team activity and collaboration metrics'
            }
        ]
    }


@router.get("/commands")
async def get_vscode_commands() -> Dict[str, Any]:
    """Get all VS Code commands provided by AUTUS"""
    return {
        'timestamp': datetime.now().isoformat(),
        'commands': [
            {
                'command': 'autus.architecture.graph',
                'title': 'AUTUS: Show Architecture Graph',
                'category': 'AUTUS',
                'keybinding': 'cmd+shift+a'
            },
            {
                'command': 'autus.quality.report',
                'title': 'AUTUS: Show Quality Report',
                'category': 'AUTUS',
                'keybinding': 'cmd+shift+q'
            },
            {
                'command': 'autus.team.activity',
                'title': 'AUTUS: Show Team Activity',
                'category': 'AUTUS',
                'keybinding': 'cmd+shift+t'
            },
            {
                'command': 'autus.monitoring.dashboard',
                'title': 'AUTUS: Show Monitoring Dashboard',
                'category': 'AUTUS',
                'keybinding': 'cmd+shift+m'
            },
            {
                'command': 'autus.quickPick',
                'title': 'AUTUS: Quick Pick',
                'category': 'AUTUS',
                'keybinding': 'cmd+k'
            }
        ]
    }


@router.get("/settings")
async def get_extension_settings() -> Dict[str, Any]:
    """Get recommended VS Code settings for AUTUS integration"""
    return {
        'timestamp': datetime.now().isoformat(),
        'vscode_settings': {
            'autus.complexityThreshold': 20,
            'autus.showCodeLens': True,
            'autus.enableDecorations': True,
            'autus.teamActivityRefresh': 300000,
            'autus.architectureRefresh': 600000,
            'autus.qualityRefresh': 300000
        },
        'launch_json': {
            'version': '0.2.0',
            'configurations': [
                {
                    'name': 'AUTUS Server',
                    'type': 'python',
                    'request': 'launch',
                    'program': '${workspaceFolder}/main.py',
                    'console': 'integratedTerminal',
                    'justMyCode': True
                }
            ]
        },
        'tasks_json': [
            {
                'label': 'AUTUS: Analyze Architecture',
                'type': 'shell',
                'command': 'curl http://localhost:8000/api/v1/architecture/graph',
                'group': 'build'
            },
            {
                'label': 'AUTUS: Generate Quality Report',
                'type': 'shell',
                'command': 'python3 scripts/performance_report.py',
                'group': 'build'
            }
        ]
    }
