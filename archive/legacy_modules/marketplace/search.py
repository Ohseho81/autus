"""
AUTUS Marketplace - Pack Search
제8법칙: 선택 - 좋은 것을 찾아 선택한다

Pack 검색, 필터, 정렬
"""
from typing import Dict, Any, List, Optional
from .registry import get_registry


class PackSearch:
    """
    Pack 검색 엔진
    
    필연적 성공:
    - 검색하면 → 결과 반환
    - 필터하면 → 정확한 결과
    - 정렬하면 → 순서대로
    """
    
    def __init__(self):
        self.registry = get_registry()
    
    def search(
        self,
        query: str = "",
        tags: List[str] = None,
        author: str = None,
        sort_by: str = "downloads",
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Pack 검색"""
        results = self.registry.list_all()
        
        # 키워드 검색
        if query:
            query_lower = query.lower()
            results = [
                p for p in results
                if query_lower in p.get("name", "").lower()
                or query_lower in p.get("description", "").lower()
                or any(query_lower in tag.lower() for tag in p.get("tags", []))
            ]
        
        # 태그 필터
        if tags:
            results = [
                p for p in results
                if any(tag in p.get("tags", []) for tag in tags)
            ]
        
        # 작성자 필터
        if author:
            results = [
                p for p in results
                if p.get("author", "").lower() == author.lower()
            ]
        
        # 정렬
        if sort_by == "downloads":
            results.sort(key=lambda x: x.get("downloads", 0), reverse=True)
        elif sort_by == "rating":
            results.sort(key=lambda x: x.get("rating", {}).get("score", 0), reverse=True)
        elif sort_by == "recent":
            results.sort(key=lambda x: x.get("registered_at", ""), reverse=True)
        elif sort_by == "name":
            results.sort(key=lambda x: x.get("name", ""))
        
        return results[:limit]
    
    def trending(self, limit: int = 10) -> List[Dict[str, Any]]:
        """인기 Pack"""
        return self.search(sort_by="downloads", limit=limit)
    
    def top_rated(self, limit: int = 10) -> List[Dict[str, Any]]:
        """평점 높은 Pack"""
        results = self.registry.list_all()
        # 최소 평가 수 필터
        rated = [p for p in results if p.get("rating", {}).get("count", 0) >= 1]
        rated.sort(key=lambda x: x.get("rating", {}).get("score", 0), reverse=True)
        return rated[:limit]
    
    def recent(self, limit: int = 10) -> List[Dict[str, Any]]:
        """최신 Pack"""
        return self.search(sort_by="recent", limit=limit)
    
    def by_tag(self, tag: str, limit: int = 20) -> List[Dict[str, Any]]:
        """태그별 Pack"""
        return self.search(tags=[tag], limit=limit)
    
    def get_all_tags(self) -> List[str]:
        """모든 태그 목록"""
        tags = set()
        for pack in self.registry.list_all():
            tags.update(pack.get("tags", []))
        return sorted(list(tags))
    
    def stats(self) -> Dict[str, Any]:
        """마켓플레이스 통계"""
        packs = self.registry.list_all()
        
        return {
            "total_packs": len(packs),
            "total_downloads": sum(p.get("downloads", 0) for p in packs),
            "total_authors": len(set(p.get("author", "") for p in packs)),
            "total_tags": len(self.get_all_tags()),
            "avg_rating": round(
                sum(p.get("rating", {}).get("score", 0) for p in packs) / max(len(packs), 1),
                2
            )
        }


# 싱글톤
_search = None

def get_search() -> PackSearch:
    global _search
    if _search is None:
        _search = PackSearch()
    return _search
