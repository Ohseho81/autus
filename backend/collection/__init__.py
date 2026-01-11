"""
AUTUS Data Collection Framework
================================

데이터 수집 경로 체계

구조:
- 5개 수집 채널 (Channel)
- 7개 데이터 도메인 (Domain)
- 72개 노드 매핑 (Node)
"""

from .framework import (
    # Enums
    CollectionChannel,
    DataDomain,
    
    # Configs
    ChannelConfig,
    DomainConfig,
    DataSource,
    
    # Data
    CHANNELS,
    DOMAINS,
    SOURCE_CATALOG,
    COLLECTION_PRIORITY,
    
    # Functions
    get_node_sources,
    get_domain_sources,
    get_recommended_setup,
    get_channel_sources,
    get_collection_summary,
)

__all__ = [
    # Enums
    "CollectionChannel",
    "DataDomain",
    
    # Configs
    "ChannelConfig",
    "DomainConfig",
    "DataSource",
    
    # Data
    "CHANNELS",
    "DOMAINS",
    "SOURCE_CATALOG",
    "COLLECTION_PRIORITY",
    
    # Functions
    "get_node_sources",
    "get_domain_sources",
    "get_recommended_setup",
    "get_channel_sources",
    "get_collection_summary",
]
