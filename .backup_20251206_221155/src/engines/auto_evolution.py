"""
AUTUS Auto Evolution
Complete pipeline: Events → Analysis → Needs → Specs → Evolution

This is the brain of the self-evolving system.
"""

import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field

from engines.pattern_analyzer import PatternAnalyzer, AnalysisResult, get_pattern_analyzer
from engines.need_detector import NeedDetector, DetectedNeed, get_need_detector
from engines.spec_generator import SpecGenerator, GeneratedSpec, get_spec_generator
from engines import Telemetry


@dataclass
class EvolutionCycle:
    """Record of one evolution cycle."""
    cycle_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    events_analyzed: int = 0
    patterns_detected: int = 0
    needs_detected: int = 0
    specs_generated: int = 0
    evolutions_run: int = 0
    success: bool = False
    details: Dict[str, Any] = field(default_factory=dict)


class AutoEvolution:
    """
    Automated evolution system.
    
    Pipeline:
    1. Collect events from Telemetry
    2. Analyze patterns
    3. Detect needs
    4. Generate specs
    5. Run evolution orchestrator
    """
    
    def __init__(self):
        self.analyzer = get_pattern_analyzer()
        self.detector = get_need_detector()
        self.generator = get_spec_generator()
        self.cycles: List[EvolutionCycle] = []
        self.auto_evolve = True  # Enable/disable auto evolution
    
    def run_cycle(self, events: Optional[List[Dict]] = None) -> EvolutionCycle:
        """
        Run one complete evolution cycle.
        
        Args:
            events: Optional events to analyze. If None, gets from Telemetry.
            
        Returns:
            EvolutionCycle record
        """
        cycle_id = f"cycle_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        cycle = EvolutionCycle(
            cycle_id=cycle_id,
            started_at=datetime.now(timezone.utc)
        )
        
        try:
            # Step 1: Get events
            if events is None:
                events = Telemetry.get_events(limit=500)
            
            cycle.events_analyzed = len(events)
            
            # Step 2: Analyze patterns
            analysis = self.analyze(events)
            cycle.patterns_detected = len(analysis.patterns)
            cycle.details["patterns"] = [
                {"type": p.pattern_type.value, "confidence": p.confidence}
                for p in analysis.patterns
            ]
            
            # Step 3: Detect needs
            needs = self.detect(analysis)
            cycle.needs_detected = len(needs)
            cycle.details["needs"] = [
                {"name": n.name, "priority": n.priority.value}
                for n in needs
            ]
            
            # Step 4: Generate specs
            specs = self.generate(needs)
            cycle.specs_generated = len(specs)
            cycle.details["specs"] = [s.file_path for s in specs]
            
            # Step 5: Run evolution (if enabled and specs generated)
            if self.auto_evolve and specs:
                evolutions = self.evolve(specs)
                cycle.evolutions_run = evolutions
            
            cycle.success = True
            
        except Exception as e:
            cycle.success = False
            cycle.details["error"] = str(e)
            Telemetry.record_error("AUTO_EVOLUTION_ERROR", str(e))
        
        cycle.completed_at = datetime.now(timezone.utc)
        self.cycles.append(cycle)
        
        # Record telemetry
        Telemetry.record_event("auto_evolution.cycle", data={
            "cycle_id": cycle_id,
            "success": cycle.success,
            "patterns": cycle.patterns_detected,
            "needs": cycle.needs_detected,
            "specs": cycle.specs_generated
        })
        
        return cycle
    
    def analyze(self, events: List[Dict]) -> AnalysisResult:
        """Analyze events for patterns."""
        return self.analyzer.analyze(events)
    
    def detect(self, analysis: AnalysisResult) -> List[DetectedNeed]:
        """Detect needs from analysis."""
        return self.detector.detect(analysis)
    
    def generate(self, needs: List[DetectedNeed]) -> List[GeneratedSpec]:
        """Generate specs from needs."""
        specs = []
        
        for need in needs:
            if need.auto_generate:
                spec = self.generator.generate(need)
                if spec:
                    # Add to backlog
                    self.generator.add_to_backlog(spec)
                    self.detector.mark_generated(need.need_id)
                    specs.append(spec)
        
        return specs
    
    def evolve(self, specs: List[GeneratedSpec]) -> int:
        """Run evolution orchestrator on generated specs."""
        count = 0
        
        for spec in specs:
            try:
                result = subprocess.run(
                    [sys.executable, "evolution_orchestrator.py", spec.file_path, "--dry-run"],
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                if result.returncode == 0:
                    count += 1
                    Telemetry.record_event("auto_evolution.evolved", data={
                        "spec": spec.file_path
                    })
            except Exception as e:
                Telemetry.record_error("EVOLUTION_RUN_ERROR", str(e))
        
        return count
    
    def get_status(self) -> Dict[str, Any]:
        """Get auto evolution status."""
        recent_cycles = self.cycles[-10:] if self.cycles else []
        
        return {
            "enabled": self.auto_evolve,
            "total_cycles": len(self.cycles),
            "successful_cycles": len([c for c in self.cycles if c.success]),
            "recent_cycles": [
                {
                    "id": c.cycle_id,
                    "success": c.success,
                    "patterns": c.patterns_detected,
                    "needs": c.needs_detected,
                    "specs": c.specs_generated
                }
                for c in recent_cycles
            ],
            "analyzer_status": {
                "known_device_types": len(self.analyzer.known_device_types),
                "known_event_types": len(self.analyzer.known_event_types)
            },
            "detector_status": self.detector.get_summary(),
            "generator_status": self.generator.get_summary()
        }
    
    def enable(self):
        """Enable auto evolution."""
        self.auto_evolve = True
    
    def disable(self):
        """Disable auto evolution."""
        self.auto_evolve = False
    
    def reset(self):
        """Reset all components."""
        self.analyzer.reset()
        self.detector.reset()
        self.cycles.clear()


# Singleton instance
_auto_evolution: Optional[AutoEvolution] = None


def get_auto_evolution() -> AutoEvolution:
    """Get or create the auto evolution singleton."""
    global _auto_evolution
    if _auto_evolution is None:
        _auto_evolution = AutoEvolution()
    return _auto_evolution

