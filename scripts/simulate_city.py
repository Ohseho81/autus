#!/usr/bin/env python3
"""
AUTUS City Simulator
Simulate 1000+ Reality Events for load testing

Usage:
    python scripts/simulate_city.py
    python scripts/simulate_city.py --events 5000 --city clark
"""

import argparse
import random
import time
import sys
from datetime import datetime
from typing import Dict, Any

try:
    import httpx
except ImportError:
    print("Installing httpx...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx"])
    import httpx


BASE_URL = "http://127.0.0.1:8003"

# Event templates
SENSOR_TYPES = ["temperature", "humidity", "motion", "power", "door", "light"]
USER_ACTIONS = ["login", "logout", "task_complete", "document_upload", "page_view"]
SYSTEM_EVENTS = ["backup_start", "backup_complete", "cache_clear", "health_check"]
LOCATIONS = ["building_a", "building_b", "building_c", "cafeteria", "library", "gym"]


def generate_sensor_event() -> Dict[str, Any]:
    """Generate a random sensor event."""
    sensor_type = random.choice(SENSOR_TYPES)
    
    if sensor_type == "temperature":
        value = random.uniform(18, 30)
        unit = "celsius"
    elif sensor_type == "humidity":
        value = random.uniform(30, 80)
        unit = "percent"
    elif sensor_type == "motion":
        value = random.choice([0, 1])
        unit = "boolean"
    elif sensor_type == "power":
        value = random.uniform(0, 5000)
        unit = "watts"
    elif sensor_type == "door":
        value = random.choice(["open", "closed"])
        unit = "state"
    else:  # light
        value = random.uniform(0, 1000)
        unit = "lux"
    
    return {
        "device_id": f"dev_{random.randint(1, 100):03d}",
        "sensor_type": sensor_type,
        "value": value,
        "unit": unit,
        "location": random.choice(LOCATIONS)
    }


def generate_user_event(city_id: str) -> Dict[str, Any]:
    """Generate a random user event."""
    return {
        "user_id": f"Z_{random.randint(1000, 9999)}",
        "action": random.choice(USER_ACTIONS),
        "city_id": city_id,
        "metadata": {
            "session_id": f"sess_{random.randint(10000, 99999)}",
            "device": random.choice(["web", "mobile", "desktop"])
        }
    }


def generate_system_event() -> Dict[str, Any]:
    """Generate a random system event."""
    return {
        "event_type": random.choice(SYSTEM_EVENTS),
        "component": random.choice(["api", "database", "cache", "pack_engine"]),
        "status": random.choice(["success", "success", "success", "warning"])  # 75% success
    }


def simulate(events: int, city_id: str, delay_ms: int = 10):
    """
    Run the simulation.
    
    Args:
        events: Number of events to generate
        city_id: City to simulate for
        delay_ms: Delay between events in milliseconds
    """
    print(f"\n🏙️ AUTUS City Simulator")
    print(f"=" * 50)
    print(f"City: {city_id}")
    print(f"Events: {events}")
    print(f"Target: {BASE_URL}")
    print(f"=" * 50)
    
    stats = {
        "total": 0,
        "success": 0,
        "failed": 0,
        "by_type": {"sensor": 0, "user": 0, "system": 0}
    }
    
    start_time = time.time()
    
    for i in range(events):
        # Choose event type
        event_type = random.choices(
            ["sensor", "user", "system"],
            weights=[0.6, 0.3, 0.1]  # 60% sensor, 30% user, 10% system
        )[0]
        
        # Generate event
        if event_type == "sensor":
            event = generate_sensor_event()
            endpoint = f"{BASE_URL}/api/v1/reality-events/webhook/sensor"
        elif event_type == "user":
            event = generate_user_event(city_id)
            endpoint = f"{BASE_URL}/api/v1/reality-events/ingest"
        else:
            event = generate_system_event()
            endpoint = f"{BASE_URL}/api/v1/reality-events/ingest"
        
        # Send event
        try:
            response = httpx.post(endpoint, json=event, timeout=5.0)
            if response.status_code in [200, 201]:
                stats["success"] += 1
            else:
                stats["failed"] += 1
            stats["by_type"][event_type] += 1
        except Exception as e:
            stats["failed"] += 1
        
        stats["total"] += 1
        
        # Progress update
        if (i + 1) % 100 == 0:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed
            print(f"📊 Progress: {i + 1}/{events} ({rate:.1f} events/sec)")
        
        # Small delay
        if delay_ms > 0:
            time.sleep(delay_ms / 1000)
    
    # Final report
    elapsed = time.time() - start_time
    
    print(f"\n{'=' * 50}")
    print(f"🏁 Simulation Complete!")
    print(f"{'=' * 50}")
    print(f"Total Events:  {stats['total']}")
    print(f"Successful:    {stats['success']} ({stats['success']/stats['total']*100:.1f}%)")
    print(f"Failed:        {stats['failed']}")
    print(f"Duration:      {elapsed:.2f}s")
    print(f"Rate:          {stats['total']/elapsed:.1f} events/sec")
    print(f"\nBy Type:")
    for t, count in stats["by_type"].items():
        print(f"  {t}: {count}")
    print(f"{'=' * 50}\n")
    
    return stats


def main():
    parser = argparse.ArgumentParser(description="AUTUS City Simulator")
    parser.add_argument("--events", type=int, default=1000, help="Number of events to simulate")
    parser.add_argument("--city", type=str, default="seoul", help="City ID to simulate")
    parser.add_argument("--delay", type=int, default=10, help="Delay between events (ms)")
    parser.add_argument("--url", type=str, default=BASE_URL, help="API base URL")
    
    args = parser.parse_args()
    
    global BASE_URL
    BASE_URL = args.url
    
    simulate(args.events, args.city, args.delay)


if __name__ == "__main__":
    main()




