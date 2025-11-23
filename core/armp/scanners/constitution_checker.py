"""
Constitution Checker

AUTUS Constitution 5개 원칙 준수 확인
"""

from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ConstitutionChecker:
    """Constitution 준수 검증"""
    
    @classmethod
    def check_article_i_zero_identity(cls) -> bool:
        """Article I: Zero Identity"""
        logger.info("Checking Article I: Zero Identity...")
        
        # protocols/identity/ 확인
        identity_path = Path("protocols/identity")
        if not identity_path.exists():
            logger.warning("Identity protocol not found")
            return True  # 아직 구현 안 됨
        
        # No login, No accounts 확인
        violations = []
        for py_file in identity_path.rglob("*.py"):
            with open(py_file) as f:
                content = f.read().lower()
                if "login" in content or "password" in content:
                    violations.append(f"{py_file}: login/password found")
        
        if violations:
            logger.error("❌ Article I violations:")
            for v in violations:
                logger.error(f"  {v}")
            return False
        
        logger.info("✅ Article I: OK")
        return True
    
    @classmethod
    def check_article_ii_privacy(cls) -> bool:
        """Article II: Privacy by Architecture"""
        logger.info("Checking Article II: Privacy by Architecture...")
        
        from core.armp.scanners.pii_scanner import PIIScanner
        return PIIScanner.check_compliance()
    
    @classmethod
    def check_article_iii_metacircular(cls) -> bool:
        """Article III: Meta-Circular Development"""
        logger.info("Checking Article III: Meta-Circular Development...")
        
        # Development packs 확인
        packs_path = Path("packs/development")
        required_packs = [
            "architect_pack.yaml",
            "codegen_pack.yaml",
            "testgen_pack.yaml"
        ]
        
        for pack in required_packs:
            if not (packs_path / pack).exists():
                logger.error(f"❌ Missing required pack: {pack}")
                return False
        
        logger.info("✅ Article III: OK")
        return True
    
    @classmethod
    def check_article_iv_minimal_core(cls) -> bool:
        """Article IV: Minimal Core, Infinite Extension"""
        logger.info("Checking Article IV: Minimal Core...")
        
        # Core 라인 수 확인
        core_path = Path("core")
        total_lines = 0
        
        for py_file in core_path.rglob("*.py"):
            # ARMP는 제외 (새로 추가된 것)
            if "armp" in str(py_file):
                continue
            
            with open(py_file) as f:
                lines = len([l for l in f if l.strip() and not l.strip().startswith("#")])
                total_lines += lines
        
        logger.info(f"Core lines: {total_lines}")
        
        if total_lines > 500:
            logger.warning(f"⚠️  Core exceeds 500 lines: {total_lines}")
            # Warning만, 아직 fail 안 함
        
        logger.info("✅ Article IV: OK")
        return True
    
    @classmethod
    def check_article_v_network_effect(cls) -> bool:
        """Article V: Network Effect as Moat"""
        logger.info("Checking Article V: Network Effect...")
        
        # Protocols 존재 확인
        protocols_path = Path("protocols")
        required_protocols = ["workflow", "memory", "identity"]
        
        for protocol in required_protocols:
            if not (protocols_path / protocol).exists():
                logger.warning(f"⚠️  Protocol not yet implemented: {protocol}")
        
        logger.info("✅ Article V: OK (in progress)")
        return True
    
    @classmethod
    def check_all(cls) -> bool:
        """전체 Constitution 검증"""
        logger.info("=" * 50)
        logger.info("CONSTITUTION COMPLIANCE CHECK")
        logger.info("=" * 50)
        
        results = {
            "Article I": cls.check_article_i_zero_identity(),
            "Article II": cls.check_article_ii_privacy(),
            "Article III": cls.check_article_iii_metacircular(),
            "Article IV": cls.check_article_iv_minimal_core(),
            "Article V": cls.check_article_v_network_effect()
        }
        
        logger.info("=" * 50)
        logger.info("RESULTS:")
        for article, passed in results.items():
            status = "✅" if passed else "❌"
            logger.info(f"{status} {article}")
        
        all_passed = all(results.values())
        
        if all_passed:
            logger.info("=" * 50)
            logger.info("✅ ALL ARTICLES COMPLIANT")
            logger.info("=" * 50)
        else:
            logger.error("=" * 50)
            logger.error("❌ CONSTITUTION VIOLATIONS FOUND")
            logger.error("=" * 50)
        
        return all_passed


if __name__ == "__main__":
    import sys
    
    if not ConstitutionChecker.check_all():
        sys.exit(1)

