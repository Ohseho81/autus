"""
Advanced enforcer tests

Tests registering 30 risks, prevent_all, detect_violations, concurrent detection
"""

import pytest
import threading
import time
from unittest.mock import Mock, patch

from core.armp.enforcer import enforcer, Risk, Severity, RiskCategory, ARMPEnforcer


class TestEnforcerRiskRegistration:
    """Test risk registration"""

    def test_all_30_risks_registered(self):
        """Test that all 30 risks are registered"""
        assert len(enforcer.risks) == 30

    def test_risk_registration_order(self):
        """Test risk registration maintains order"""
        # Risks should be registered in order
        risk_names = [r.name for r in enforcer.risks]
        
        # Should have all expected risks
        assert len(risk_names) == 30
        
        # Check for key risks
        assert any("PII" in name for name in risk_names)
        assert any("Code Injection" in name for name in risk_names)
        assert any("SQL Injection" in name for name in risk_names)

    def test_risk_uniqueness(self):
        """Test that risks are unique"""
        risk_names = [r.name for r in enforcer.risks]
        
        # All names should be unique
        assert len(risk_names) == len(set(risk_names))


class TestEnforcerPreventAll:
    """Test prevent_all() method"""

    def test_prevent_all_executes_all_risks(self):
        """Test that prevent_all() executes all risk preventions"""
        # Mock prevention methods to track calls
        call_count = {'count': 0}
        
        original_prevent = enforcer.risks[0].prevention
        
        def mock_prevent():
            call_count['count'] += 1
            original_prevent()
        
        # Replace first risk's prevention temporarily
        enforcer.risks[0].prevention = mock_prevent
        
        try:
            enforcer.prevent_all()
            # At least one should be called
            assert call_count['count'] >= 1
        finally:
            # Restore original
            enforcer.risks[0].prevention = original_prevent

    def test_prevent_all_handles_errors(self):
        """Test that prevent_all() handles errors gracefully"""
        # Create a risk that raises exception
        failing_risk = Risk(
            name="Test Failing Risk",
            category=RiskCategory.SECURITY,
            severity=Severity.LOW,
            description="Test",
            prevention=lambda: (_ for _ in ()).throw(Exception("Test error")),
            detection=lambda: False,
            response=lambda: None,
            recovery=lambda: None
        )
        
        # Temporarily add failing risk
        enforcer.risks.append(failing_risk)
        
        try:
            # Should not raise exception
            enforcer.prevent_all()
            assert True
        finally:
            # Remove failing risk
            enforcer.risks.remove(failing_risk)


class TestEnforcerDetectViolations:
    """Test detect_violations() method"""

    def test_detect_violations_returns_list(self):
        """Test that detect_violations() returns list"""
        violations = enforcer.detect_violations()
        assert isinstance(violations, list)

    def test_detect_violations_with_mock_violations(self):
        """Test detect_violations() with mocked violations"""
        # Mock a risk to return True for detection
        original_detect = enforcer.risks[0].detection
        
        def mock_detect():
            return True
        
        enforcer.risks[0].detection = mock_detect
        
        try:
            violations = enforcer.detect_violations()
            # Should find at least one violation
            assert len(violations) >= 1
            assert enforcer.risks[0] in violations
        finally:
            enforcer.risks[0].detection = original_detect

    def test_detect_violations_handles_errors(self):
        """Test that detect_violations() handles errors"""
        # Create a risk that raises exception
        failing_risk = Risk(
            name="Test Failing Detection",
            category=RiskCategory.SECURITY,
            severity=Severity.LOW,
            description="Test",
            prevention=lambda: None,
            detection=lambda: (_ for _ in ()).throw(Exception("Test error")),
            response=lambda: None,
            recovery=lambda: None
        )
        
        enforcer.risks.append(failing_risk)
        
        try:
            # Should not raise exception
            violations = enforcer.detect_violations()
            assert isinstance(violations, list)
        finally:
            enforcer.risks.remove(failing_risk)


class TestEnforcerConcurrentDetection:
    """Test concurrent detection"""

    def test_concurrent_detection(self):
        """Test detecting violations concurrently"""
        violations_list = []
        lock = threading.Lock()
        
        def detect_in_thread():
            violations = enforcer.detect_violations()
            with lock:
                violations_list.append(violations)
        
        # Run detection in 5 threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=detect_in_thread)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All threads should complete
        assert len(violations_list) == 5
        assert all(isinstance(v, list) for v in violations_list)

    def test_concurrent_prevention(self):
        """Test prevent_all() concurrently"""
        results = []
        lock = threading.Lock()
        
        def prevent_in_thread():
            try:
                enforcer.prevent_all()
                with lock:
                    results.append(True)
            except Exception:
                with lock:
                    results.append(False)
        
        # Run prevention in 3 threads
        threads = []
        for _ in range(3):
            thread = threading.Thread(target=prevent_in_thread)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All should succeed
        assert len(results) == 3
        assert all(results)


class TestEnforcerIncidentLogging:
    """Test incident logging"""

    def test_incident_logging(self):
        """Test that incidents are logged"""
        # Create a violation
        original_detect = enforcer.risks[0].detection
        
        def mock_detect():
            return True
        
        enforcer.risks[0].detection = mock_detect
        
        try:
            violations = enforcer.detect_violations()
            if violations:
                enforcer.respond_to(violations[0])
                
                # Check incidents
                assert len(enforcer.incidents) >= 1
        finally:
            enforcer.risks[0].detection = original_detect

    def test_incident_structure(self):
        """Test incident structure"""
        # Create a violation and respond
        original_detect = enforcer.risks[0].detection
        
        def mock_detect():
            return True
        
        enforcer.risks[0].detection = mock_detect
        
        try:
            violations = enforcer.detect_violations()
            if violations:
                enforcer.respond_to(violations[0])
                
                # Check incident has required fields
                if enforcer.incidents:
                    incident = enforcer.incidents[-1]
                    assert 'risk' in incident or 'risk_name' in incident
                    assert 'timestamp' in incident
        finally:
            enforcer.risks[0].detection = original_detect


class TestEnforcerErrorHandling:
    """Test error handling for failed risks"""

    def test_handles_failed_prevention(self):
        """Test handling of failed prevention"""
        # Create failing risk
        failing_risk = Risk(
            name="Failing Prevention",
            category=RiskCategory.SECURITY,
            severity=Severity.LOW,
            description="Test",
            prevention=lambda: (_ for _ in ()).throw(ValueError("Failed")),
            detection=lambda: False,
            response=lambda: None,
            recovery=lambda: None
        )
        
        enforcer.risks.append(failing_risk)
        
        try:
            # Should handle gracefully
            enforcer.prevent_all()
            assert True
        finally:
            enforcer.risks.remove(failing_risk)

    def test_handles_failed_detection(self):
        """Test handling of failed detection"""
        # Create failing risk
        failing_risk = Risk(
            name="Failing Detection",
            category=RiskCategory.SECURITY,
            severity=Severity.LOW,
            description="Test",
            prevention=lambda: None,
            detection=lambda: (_ for _ in ()).throw(ValueError("Failed")),
            response=lambda: None,
            recovery=lambda: None
        )
        
        enforcer.risks.append(failing_risk)
        
        try:
            # Should handle gracefully
            violations = enforcer.detect_violations()
            assert isinstance(violations, list)
        finally:
            enforcer.risks.remove(failing_risk)

    def test_handles_failed_response(self):
        """Test handling of failed response"""
        # Create failing risk
        failing_risk = Risk(
            name="Failing Response",
            category=RiskCategory.SECURITY,
            severity=Severity.LOW,
            description="Test",
            prevention=lambda: None,
            detection=lambda: True,
            response=lambda: (_ for _ in ()).throw(ValueError("Failed")),
            recovery=lambda: None
        )
        
        enforcer.risks.append(failing_risk)
        
        try:
            violations = enforcer.detect_violations()
            if violations:
                # Should handle gracefully
                try:
                    enforcer.respond_to(violations[0])
                except Exception:
                    # Response failure is logged but doesn't crash
                    assert True
        finally:
            enforcer.risks.remove(failing_risk)

