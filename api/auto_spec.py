"""
AUTUS Auto Spec API
Endpoints for the auto-spec generation system

POST /auto/analyze - Analyze current events
GET /auto/needs - Get detected needs
POST /auto/generate - Generate specs from needs
GET /auto/specs - List generated specs
GET /auto/status - Get system status
POST /auto/cycle - Run complete evolution cycle
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from engines.pattern_analyzer import get_pattern_analyzer, PatternType
from engines.need_detector import get_need_detector, NeedPriority
from engines.spec_generator import get_spec_generator
from engines.auto_evolution import get_auto_evolution
from engines import Telemetry

router = APIRouter(prefix="/auto", tags=["auto-spec"])


# ==========================================
# Analysis Endpoints
# ==========================================

@router.post("/analyze")
async def analyze_events(
    limit: int = Query(default=100, description="Number of events to analyze")
):
    """
    Analyze current events for patterns.
    
    Returns detected patterns with confidence scores.
    """
    # Get events from telemetry
    events = Telemetry.get_events(limit=limit)
    
    # Analyze
    analyzer = get_pattern_analyzer()
    result = analyzer.analyze(events)
    
    return {
        "event_count": result.event_count,
        "patterns": [
            {
                "type": p.pattern_type.value,
                "confidence": p.confidence,
                "severity": p.severity,
                "details": p.details,
                "detected_at": p.detected_at.isoformat()
            }
            for p in result.patterns
        ],
        "statistics": result.statistics,
        "window": {
            "start": result.window_start.isoformat(),
            "end": result.window_end.isoformat()
        }
    }


@router.post("/analyze/simulate")
async def simulate_analysis(
    error_rate: float = Query(default=0.0, description="Simulated error rate"),
    new_devices: int = Query(default=0, description="Number of new device types"),
    traffic_multiplier: float = Query(default=1.0, description="Traffic multiplier")
):
    """
    Simulate events and analyze patterns.
    
    Useful for testing the auto-spec system.
    """
    import random
    
    # Generate simulated events
    events = []
    
    # Normal events
    for i in range(100):
        event_type = "sensor.reading" if random.random() > error_rate else "error.processing"
        events.append({
            "type": event_type,
            "source": "device",
            "device_id": f"dev_{random.randint(1, 10):03d}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # New device types
    for i in range(new_devices):
        events.append({
            "type": "sensor.reading",
            "source": "device",
            "device_id": f"new_type_{i}_001",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Analyze
    analyzer = get_pattern_analyzer()
    result = analyzer.analyze(events)
    
    return {
        "simulated_events": len(events),
        "patterns_detected": len(result.patterns),
        "patterns": [
            {
                "type": p.pattern_type.value,
                "confidence": p.confidence,
                "details": p.details
            }
            for p in result.patterns
        ]
    }


# ==========================================
# Needs Endpoints
# ==========================================

@router.get("/needs")
async def get_detected_needs(
    priority: Optional[str] = Query(default=None, description="Filter by priority")
):
    """
    Get detected feature needs.
    """
    detector = get_need_detector()
    
    if priority:
        try:
            p = NeedPriority(priority)
            needs = detector.get_needs_by_priority(p)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {priority}")
    else:
        needs = detector.detected_needs
    
    return {
        "total": len(needs),
        "needs": [
            {
                "need_id": n.need_id,
                "name": n.name,
                "description": n.description,
                "priority": n.priority.value,
                "spec_template": n.spec_template,
                "triggered_by": n.triggered_by.value,
                "auto_generate": n.auto_generate,
                "detected_at": n.detected_at.isoformat()
            }
            for n in needs
        ],
        "summary": detector.get_summary()
    }


@router.get("/needs/pending")
async def get_pending_needs():
    """Get needs that haven't been converted to specs yet."""
    detector = get_need_detector()
    pending = detector.get_pending_needs()
    
    return {
        "total": len(pending),
        "pending": [
            {
                "need_id": n.need_id,
                "name": n.name,
                "priority": n.priority.value,
                "auto_generate": n.auto_generate
            }
            for n in pending
        ]
    }


# ==========================================
# Spec Generation Endpoints
# ==========================================

@router.post("/generate")
async def generate_specs(
    auto_only: bool = Query(default=True, description="Only auto-generate eligible needs")
):
    """
    Generate specs from detected needs.
    """
    detector = get_need_detector()
    generator = get_spec_generator()
    
    if auto_only:
        needs = detector.get_auto_generate_needs()
    else:
        needs = detector.get_pending_needs()
    
    specs = []
    for need in needs:
        spec = generator.generate(need)
        if spec:
            generator.add_to_backlog(spec)
            detector.mark_generated(need.need_id)
            specs.append({
                "spec_id": spec.spec_id,
                "name": spec.name,
                "file_path": spec.file_path,
                "need_id": spec.need_id
            })
    
    return {
        "generated": len(specs),
        "specs": specs
    }


@router.get("/specs")
async def list_generated_specs():
    """List all generated specs."""
    generator = get_spec_generator()
    
    return {
        "total": len(generator.generated_specs),
        "specs": [
            {
                "spec_id": s.spec_id,
                "name": s.name,
                "file_path": s.file_path,
                "generated_at": s.generated_at.isoformat()
            }
            for s in generator.generated_specs
        ],
        "files": generator.get_spec_files()
    }


# ==========================================
# Full Cycle Endpoints
# ==========================================

@router.post("/cycle")
async def run_evolution_cycle(
    dry_run: bool = Query(default=True, description="Don't actually run evolution")
):
    """
    Run a complete evolution cycle.
    
    Events → Analysis → Needs → Specs → (Evolution)
    """
    auto_evo = get_auto_evolution()
    
    # Temporarily disable actual evolution if dry run
    original_auto = auto_evo.auto_evolve
    if dry_run:
        auto_evo.auto_evolve = False
    
    try:
        cycle = auto_evo.run_cycle()
        
        return {
            "cycle_id": cycle.cycle_id,
            "success": cycle.success,
            "events_analyzed": cycle.events_analyzed,
            "patterns_detected": cycle.patterns_detected,
            "needs_detected": cycle.needs_detected,
            "specs_generated": cycle.specs_generated,
            "evolutions_run": cycle.evolutions_run,
            "duration_ms": (
                (cycle.completed_at - cycle.started_at).total_seconds() * 1000
                if cycle.completed_at else 0
            ),
            "details": cycle.details,
            "dry_run": dry_run
        }
    finally:
        auto_evo.auto_evolve = original_auto


@router.get("/status")
async def get_auto_spec_status():
    """Get complete auto-spec system status."""
    auto_evo = get_auto_evolution()
    
    return {
        "status": "active" if auto_evo.auto_evolve else "disabled",
        **auto_evo.get_status()
    }


@router.post("/enable")
async def enable_auto_evolution():
    """Enable automatic evolution."""
    auto_evo = get_auto_evolution()
    auto_evo.enable()
    return {"status": "enabled"}


@router.post("/disable")
async def disable_auto_evolution():
    """Disable automatic evolution."""
    auto_evo = get_auto_evolution()
    auto_evo.disable()
    return {"status": "disabled"}


@router.post("/reset")
async def reset_auto_spec():
    """Reset all auto-spec components."""
    auto_evo = get_auto_evolution()
    auto_evo.reset()
    return {"status": "reset", "message": "All components reset"}

