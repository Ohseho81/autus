"""
AUTUS Auto-Provisioner v14.0
==============================
외부 서비스 자동 설정 시스템

지원 서비스:
- Supabase (DB + Auth)
- Netlify (Frontend)
- Railway (Backend)
- Cloudflare (DNS)
- GitHub (Repo)
"""

import os
import asyncio
import aiohttp
import json
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

# ============================================
# Service Types
# ============================================

class ServiceType(str, Enum):
    SUPABASE = "supabase"
    NETLIFY = "netlify"
    RAILWAY = "railway"
    CLOUDFLARE = "cloudflare"
    GITHUB = "github"
    VERCEL = "vercel"

@dataclass
class ServiceCredentials:
    """서비스 인증 정보"""
    api_key: str
    api_url: Optional[str] = None
    project_id: Optional[str] = None

@dataclass
class ProvisionResult:
    """프로비저닝 결과"""
    success: bool
    service: ServiceType
    message: str
    data: Optional[Dict] = None
    url: Optional[str] = None

# ============================================
# Supabase Provisioner
# ============================================

class SupabaseProvisioner:
    """Supabase 자동 설정"""
    
    def __init__(self, api_key: str, project_url: str):
        self.api_key = api_key
        self.project_url = project_url
        self.headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def apply_schema(self, sql: str) -> ProvisionResult:
        """SQL 스키마 적용"""
        url = f"{self.project_url}/rest/v1/rpc/exec_sql"
        
        # Supabase는 직접 SQL 실행이 제한적이므로
        # pgAdmin 또는 SQL Editor 사용 권장
        # 여기서는 테이블 존재 여부 확인
        
        async with aiohttp.ClientSession() as session:
            # 테이블 목록 조회
            check_url = f"{self.project_url}/rest/v1/"
            async with session.get(check_url, headers=self.headers) as resp:
                if resp.status == 200:
                    return ProvisionResult(
                        success=True,
                        service=ServiceType.SUPABASE,
                        message="Supabase 연결 성공. SQL Editor에서 스키마를 적용하세요.",
                        url=f"{self.project_url.replace('.supabase.co', '.supabase.com')}/project/default/sql"
                    )
                else:
                    return ProvisionResult(
                        success=False,
                        service=ServiceType.SUPABASE,
                        message=f"Supabase 연결 실패: {resp.status}"
                    )
    
    async def create_table(self, table_name: str, columns: Dict[str, str]) -> ProvisionResult:
        """테이블 생성 (PostgREST를 통해)"""
        # PostgREST는 DDL을 직접 지원하지 않음
        # Supabase Management API 사용 필요
        return ProvisionResult(
            success=False,
            service=ServiceType.SUPABASE,
            message="Supabase Management API 키가 필요합니다. Dashboard에서 설정하세요."
        )

# ============================================
# Netlify Provisioner
# ============================================

class NetlifyProvisioner:
    """Netlify 자동 배포"""
    
    BASE_URL = "https://api.netlify.com/api/v1"
    
    def __init__(self, access_token: str):
        self.token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    async def list_sites(self) -> List[Dict]:
        """사이트 목록"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.BASE_URL}/sites",
                headers=self.headers
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                return []
    
    async def deploy_site(
        self, 
        site_id: str, 
        deploy_dir: str
    ) -> ProvisionResult:
        """사이트 배포"""
        import zipfile
        import io
        
        # 디렉토리를 ZIP으로
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(deploy_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, deploy_dir)
                    zf.write(file_path, arcname)
        
        zip_buffer.seek(0)
        
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/zip"
            }
            async with session.post(
                f"{self.BASE_URL}/sites/{site_id}/deploys",
                headers=headers,
                data=zip_buffer.read()
            ) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    return ProvisionResult(
                        success=True,
                        service=ServiceType.NETLIFY,
                        message="배포 성공!",
                        data=data,
                        url=data.get("ssl_url") or data.get("url")
                    )
                else:
                    text = await resp.text()
                    return ProvisionResult(
                        success=False,
                        service=ServiceType.NETLIFY,
                        message=f"배포 실패: {text}"
                    )
    
    async def create_site(self, name: str) -> ProvisionResult:
        """새 사이트 생성"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.BASE_URL}/sites",
                headers=self.headers,
                json={"name": name}
            ) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    return ProvisionResult(
                        success=True,
                        service=ServiceType.NETLIFY,
                        message=f"사이트 생성: {data['name']}",
                        data=data,
                        url=data.get("ssl_url")
                    )
                else:
                    return ProvisionResult(
                        success=False,
                        service=ServiceType.NETLIFY,
                        message="사이트 생성 실패"
                    )

# ============================================
# Railway Provisioner
# ============================================

class RailwayProvisioner:
    """Railway 자동 배포"""
    
    GRAPHQL_URL = "https://backboard.railway.app/graphql/v2"
    
    def __init__(self, api_token: str):
        self.token = api_token
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    async def _graphql(self, query: str, variables: Dict = None) -> Dict:
        """GraphQL 요청"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.GRAPHQL_URL,
                headers=self.headers,
                json={"query": query, "variables": variables or {}}
            ) as resp:
                return await resp.json()
    
    async def list_projects(self) -> List[Dict]:
        """프로젝트 목록"""
        query = """
        query {
            me {
                projects {
                    edges {
                        node {
                            id
                            name
                            services {
                                edges {
                                    node {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        """
        result = await self._graphql(query)
        projects = result.get("data", {}).get("me", {}).get("projects", {}).get("edges", [])
        return [p["node"] for p in projects]
    
    async def deploy_from_github(
        self, 
        project_id: str,
        repo: str,
        branch: str = "main"
    ) -> ProvisionResult:
        """GitHub에서 배포"""
        query = """
        mutation($projectId: String!, $repo: String!, $branch: String!) {
            serviceCreate(input: {
                projectId: $projectId
                source: {
                    repo: $repo
                    branch: $branch
                }
            }) {
                id
                name
            }
        }
        """
        result = await self._graphql(query, {
            "projectId": project_id,
            "repo": repo,
            "branch": branch
        })
        
        if "errors" in result:
            return ProvisionResult(
                success=False,
                service=ServiceType.RAILWAY,
                message=str(result["errors"])
            )
        
        return ProvisionResult(
            success=True,
            service=ServiceType.RAILWAY,
            message="Railway 배포 시작",
            data=result.get("data", {}).get("serviceCreate")
        )
    
    async def set_env_vars(
        self, 
        project_id: str,
        service_id: str,
        env_vars: Dict[str, str]
    ) -> ProvisionResult:
        """환경변수 설정"""
        query = """
        mutation($projectId: String!, $serviceId: String!, $variables: EnvironmentVariablesInput!) {
            variableCollectionUpsert(input: {
                projectId: $projectId
                serviceId: $serviceId
                variables: $variables
            })
        }
        """
        result = await self._graphql(query, {
            "projectId": project_id,
            "serviceId": service_id,
            "variables": env_vars
        })
        
        if "errors" in result:
            return ProvisionResult(
                success=False,
                service=ServiceType.RAILWAY,
                message=str(result["errors"])
            )
        
        return ProvisionResult(
            success=True,
            service=ServiceType.RAILWAY,
            message=f"{len(env_vars)}개 환경변수 설정됨"
        )

# ============================================
# GitHub Provisioner
# ============================================

class GitHubProvisioner:
    """GitHub 자동 설정"""
    
    BASE_URL = "https://api.github.com"
    
    def __init__(self, token: str):
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    
    async def get_repo(self, owner: str, repo: str) -> Dict:
        """레포 정보"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}",
                headers=self.headers
            ) as resp:
                return await resp.json()
    
    async def create_webhook(
        self, 
        owner: str, 
        repo: str,
        webhook_url: str,
        events: List[str] = None
    ) -> ProvisionResult:
        """웹훅 생성"""
        events = events or ["push", "pull_request"]
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.BASE_URL}/repos/{owner}/{repo}/hooks",
                headers=self.headers,
                json={
                    "name": "web",
                    "active": True,
                    "events": events,
                    "config": {
                        "url": webhook_url,
                        "content_type": "json"
                    }
                }
            ) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    return ProvisionResult(
                        success=True,
                        service=ServiceType.GITHUB,
                        message="웹훅 생성됨",
                        data=data
                    )
                else:
                    return ProvisionResult(
                        success=False,
                        service=ServiceType.GITHUB,
                        message=f"웹훅 생성 실패: {resp.status}"
                    )

# ============================================
# Master Provisioner (통합)
# ============================================

class AutoProvisioner:
    """
    AUTUS 통합 프로비저너
    
    모든 외부 서비스를 한 번에 설정
    """
    
    def __init__(self):
        self.credentials: Dict[ServiceType, ServiceCredentials] = {}
        self._load_credentials()
    
    def _load_credentials(self):
        """환경변수에서 인증 정보 로드"""
        # Supabase
        if os.getenv("SUPABASE_SERVICE_KEY"):
            self.credentials[ServiceType.SUPABASE] = ServiceCredentials(
                api_key=os.getenv("SUPABASE_SERVICE_KEY"),
                api_url=os.getenv("SUPABASE_URL")
            )
        
        # Netlify
        if os.getenv("NETLIFY_ACCESS_TOKEN"):
            self.credentials[ServiceType.NETLIFY] = ServiceCredentials(
                api_key=os.getenv("NETLIFY_ACCESS_TOKEN")
            )
        
        # Railway
        if os.getenv("RAILWAY_API_TOKEN"):
            self.credentials[ServiceType.RAILWAY] = ServiceCredentials(
                api_key=os.getenv("RAILWAY_API_TOKEN")
            )
        
        # GitHub
        if os.getenv("GITHUB_TOKEN"):
            self.credentials[ServiceType.GITHUB] = ServiceCredentials(
                api_key=os.getenv("GITHUB_TOKEN")
            )
    
    def set_credentials(self, service: ServiceType, creds: ServiceCredentials):
        """인증 정보 설정"""
        self.credentials[service] = creds
    
    async def provision_all(
        self,
        github_repo: str = "Ohseho81/autus",
        netlify_site_id: Optional[str] = None,
        railway_project_id: Optional[str] = None,
        deploy_dir: str = "frontend/deploy"
    ) -> Dict[ServiceType, ProvisionResult]:
        """
        전체 자동 프로비저닝
        
        1. Supabase 연결 확인
        2. Netlify 배포
        3. Railway 배포
        4. GitHub 웹훅 설정
        """
        results = {}
        
        # 1. Supabase
        if ServiceType.SUPABASE in self.credentials:
            creds = self.credentials[ServiceType.SUPABASE]
            provisioner = SupabaseProvisioner(creds.api_key, creds.api_url)
            results[ServiceType.SUPABASE] = await provisioner.apply_schema("")
        else:
            results[ServiceType.SUPABASE] = ProvisionResult(
                success=False,
                service=ServiceType.SUPABASE,
                message="SUPABASE_SERVICE_KEY 환경변수가 필요합니다"
            )
        
        # 2. Netlify
        if ServiceType.NETLIFY in self.credentials:
            creds = self.credentials[ServiceType.NETLIFY]
            provisioner = NetlifyProvisioner(creds.api_key)
            
            if netlify_site_id:
                results[ServiceType.NETLIFY] = await provisioner.deploy_site(
                    netlify_site_id, deploy_dir
                )
            else:
                # 사이트 목록 조회
                sites = await provisioner.list_sites()
                results[ServiceType.NETLIFY] = ProvisionResult(
                    success=True,
                    service=ServiceType.NETLIFY,
                    message=f"{len(sites)}개 사이트 발견",
                    data={"sites": [{"id": s["id"], "name": s["name"]} for s in sites[:5]]}
                )
        else:
            results[ServiceType.NETLIFY] = ProvisionResult(
                success=False,
                service=ServiceType.NETLIFY,
                message="NETLIFY_ACCESS_TOKEN 환경변수가 필요합니다"
            )
        
        # 3. Railway
        if ServiceType.RAILWAY in self.credentials:
            creds = self.credentials[ServiceType.RAILWAY]
            provisioner = RailwayProvisioner(creds.api_key)
            
            projects = await provisioner.list_projects()
            results[ServiceType.RAILWAY] = ProvisionResult(
                success=True,
                service=ServiceType.RAILWAY,
                message=f"{len(projects)}개 프로젝트 발견",
                data={"projects": projects[:5]}
            )
        else:
            results[ServiceType.RAILWAY] = ProvisionResult(
                success=False,
                service=ServiceType.RAILWAY,
                message="RAILWAY_API_TOKEN 환경변수가 필요합니다"
            )
        
        # 4. GitHub
        if ServiceType.GITHUB in self.credentials:
            creds = self.credentials[ServiceType.GITHUB]
            provisioner = GitHubProvisioner(creds.api_key)
            
            owner, repo = github_repo.split("/")
            repo_info = await provisioner.get_repo(owner, repo)
            results[ServiceType.GITHUB] = ProvisionResult(
                success=True,
                service=ServiceType.GITHUB,
                message=f"레포 확인: {repo_info.get('full_name')}",
                url=repo_info.get("html_url")
            )
        else:
            results[ServiceType.GITHUB] = ProvisionResult(
                success=False,
                service=ServiceType.GITHUB,
                message="GITHUB_TOKEN 환경변수가 필요합니다"
            )
        
        return results
    
    def get_required_env_vars(self) -> Dict[str, str]:
        """필요한 환경변수 목록"""
        return {
            "SUPABASE_URL": "Supabase 프로젝트 URL",
            "SUPABASE_SERVICE_KEY": "Supabase Service Role Key",
            "NETLIFY_ACCESS_TOKEN": "Netlify Personal Access Token",
            "RAILWAY_API_TOKEN": "Railway API Token",
            "GITHUB_TOKEN": "GitHub Personal Access Token (repo 권한)",
        }


# ============================================
# Singleton
# ============================================

_provisioner: Optional[AutoProvisioner] = None

def get_provisioner() -> AutoProvisioner:
    """프로비저너 싱글톤"""
    global _provisioner
    if _provisioner is None:
        _provisioner = AutoProvisioner()
    return _provisioner
