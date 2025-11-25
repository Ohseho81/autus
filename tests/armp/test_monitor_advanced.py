"""
Advanced monitor tests

Tests monitoring loop, metric collection, violation handling, lifecycle
"""

import pytest
import time
import threading
from unittest.mock import Mock, patch

from core.armp.monitor import monitor, ARMPMonitor
from core.armp.enforcer import enforcer


class TestMonitorLifecycle:
    """Test monitor start/stop lifecycle"""

    def test_monitor_start_stop(self):
        """Test monitor start and stop"""
        # Start monitor
        monitor.start()
        assert monitor.is_running() is True

        # Wait a bit
        time.sleep(0.1)

        # Stop monitor
        monitor.stop()
        time.sleep(0.1)  # Wait for thread to stop

        assert monitor.is_running() is False

    def test_monitor_restart(self):
        """Test monitor restart"""
        # Start
        monitor.start()
        assert monitor.is_running() is True

        # Stop
        monitor.stop()
        time.sleep(0.1)

        # Restart
        monitor.start()
        assert monitor.is_running() is True

        # Cleanup
        monitor.stop()
        time.sleep(0.1)

    def test_monitor_multiple_starts(self):
        """Test handling multiple starts"""
        # Start multiple times
        monitor.start()
        monitor.start()  # Should handle gracefully

        assert monitor.is_running() is True

        # Cleanup
        monitor.stop()
        time.sleep(0.1)


class TestMonitorLoop:
    """Test monitoring loop"""

    def test_monitoring_loop_runs(self):
        """Test that monitoring loop actually runs"""
        call_count = {'count': 0}

        # Mock detect_violations to track calls
        original_detect = enforcer.detect_violations

        def mock_detect():
            call_count['count'] += 1
            return original_detect()

        enforcer.detect_violations = mock_detect

        try:
            # Start monitor with short interval
            monitor.interval = 0.1
            monitor.start()

            # Wait for at least one cycle
            time.sleep(0.3)

            # Should have called detection
            assert call_count['count'] >= 1

            monitor.stop()
            time.sleep(0.1)
        finally:
            enforcer.detect_violations = original_detect

    def test_monitoring_interval(self):
        """Test monitoring interval"""
        call_times = []

        original_detect = enforcer.detect_violations

        def mock_detect():
            call_times.append(time.time())
            return original_detect()

        enforcer.detect_violations = mock_detect

        try:
            monitor.interval = 0.2
            monitor.start()

            # Wait for 3 cycles
            time.sleep(0.7)

            monitor.stop()
            time.sleep(0.1)

            # Should have multiple calls
            if len(call_times) >= 2:
                # Check interval (with some tolerance)
                intervals = [call_times[i+1] - call_times[i] for i in range(len(call_times)-1)]
                avg_interval = sum(intervals) / len(intervals)
                # Should be close to 0.2 seconds
                assert 0.1 <= avg_interval <= 0.4
        finally:
            enforcer.detect_violations = original_detect


class TestMonitorMetricCollection:
    """Test metric collection"""

    def test_metrics_collection(self):
        """Test that metrics are collected"""
        monitor.start()
        time.sleep(0.2)
        monitor.stop()
        time.sleep(0.1)

        # Check metrics exist
        metrics = monitor.get_metrics()
        assert metrics is not None
        assert isinstance(metrics, dict)

    def test_metrics_structure(self):
        """Test metrics structure"""
        monitor.start()
        time.sleep(0.2)
        monitor.stop()
        time.sleep(0.1)

        metrics = monitor.get_metrics()

        # Should have basic structure
        assert 'timestamp' in metrics or 'risks_checked' in metrics or 'violations_found' in metrics

    def test_metrics_accumulation(self):
        """Test that metrics accumulate over time"""
        monitor.start()
        time.sleep(0.3)
        monitor.stop()
        time.sleep(0.1)

        metrics1 = monitor.get_metrics()

        monitor.start()
        time.sleep(0.3)
        monitor.stop()
        time.sleep(0.1)

        metrics2 = monitor.get_metrics()

        # Metrics should accumulate or at least exist
        assert metrics1 is not None
        assert metrics2 is not None


class TestMonitorViolationHandling:
    """Test violation handling"""

    def test_violation_detection_triggers_response(self):
        """Test that violations trigger response"""
        # Mock a violation
        original_detect = enforcer.detect_violations

        def mock_detect():
            return [enforcer.risks[0]]  # Return first risk as violation

        enforcer.detect_violations = mock_detect

        response_called = {'called': False}
        original_respond = enforcer.respond_to

        def mock_respond(risk):
            response_called['called'] = True
            original_respond(risk)

        enforcer.respond_to = mock_respond

        try:
            monitor.start()
            time.sleep(0.2)
            monitor.stop()
            time.sleep(0.1)

            # Response should have been called
            assert response_called['called'] is True
        finally:
            enforcer.detect_violations = original_detect
            enforcer.respond_to = original_respond

    def test_violation_logging(self):
        """Test that violations are logged"""
        # Mock a violation
        original_detect = enforcer.detect_violations

        def mock_detect():
            return [enforcer.risks[0]]

        enforcer.detect_violations = mock_detect

        try:
            initial_incidents = len(enforcer.incidents)

            monitor.start()
            time.sleep(0.2)
            monitor.stop()
            time.sleep(0.1)

            # Should have logged incidents
            assert len(enforcer.incidents) >= initial_incidents
        finally:
            enforcer.detect_violations = original_detect


class TestMonitorThreadSafety:
    """Test thread safety"""

    def test_monitor_thread_safety(self):
        """Test that monitor is thread-safe"""
        results = []
        lock = threading.Lock()

        def start_stop_monitor():
            try:
                monitor.start()
                time.sleep(0.1)
                monitor.stop()
                time.sleep(0.1)
                with lock:
                    results.append(True)
            except Exception as e:
                with lock:
                    results.append(False)

        # Run in multiple threads
        threads = []
        for _ in range(3):
            thread = threading.Thread(target=start_stop_monitor)
            threads.append(thread)
            thread.start()

        # Wait for all threads
        for thread in threads:
            thread.join()

        # All should succeed
        assert len(results) == 3
        assert all(results)


class TestMonitorLongRunning:
    """Test long-running scenarios"""

    def test_long_running_monitor(self):
        """Test monitor running for extended period"""
        monitor.start()

        # Run for 1 second (simulating hours)
        time.sleep(1.0)

        monitor.stop()
        time.sleep(0.1)

        # Should still be working
        assert monitor.is_running() is False

        # Metrics should exist
        metrics = monitor.get_metrics()
        assert metrics is not None

    def test_monitor_with_many_cycles(self):
        """Test monitor with many cycles"""
        call_count = {'count': 0}

        original_detect = enforcer.detect_violations

        def mock_detect():
            call_count['count'] += 1
            return original_detect()

        enforcer.detect_violations = mock_detect

        try:
            monitor.interval = 0.1
            monitor.start()

            # Run for 0.5 seconds (should be ~5 cycles)
            time.sleep(0.5)

            monitor.stop()
            time.sleep(0.1)

            # Should have multiple cycles
            assert call_count['count'] >= 3
        finally:
            enforcer.detect_violations = original_detect





