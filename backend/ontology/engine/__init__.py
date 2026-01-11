"""
AUTUS Ontology Engine v0.1.1
============================

Core components for ontology management:
- OntologyInitializer: Create and manage user ontologies
- LogProcessor: Process user logs and update node states
- EvidenceGate: Validate data reliability before actions
- NodeDiagnosis: Self-diagnostic reports

v0.1.1 Changes:
- Evidence Gate warning state improvements
- Logarithmic reliability calculation
- Consistency score implementation
- Node self-diagnosis system
"""

from .initializer import (
    OntologyInitializer,
    UserOntology,
    NodeState,
    BASE_DIR,
    create_new_user,
    load_user,
    save_user,
)

from .processor import (
    LogProcessor,
    LogEntry,
    PatternMatch,
    ProcessingResult,
    NodeDiagnosis,
    EvidenceGate,
    process_log,
    process_logs,
    get_summary,
)

__all__ = [
    # Initializer
    'OntologyInitializer',
    'UserOntology',
    'NodeState',
    'BASE_DIR',
    'create_new_user',
    'load_user',
    'save_user',
    
    # Processor
    'LogProcessor',
    'LogEntry',
    'PatternMatch',
    'ProcessingResult',
    'NodeDiagnosis',
    'EvidenceGate',
    'process_log',
    'process_logs',
    'get_summary',
]

__version__ = '0.1.1'