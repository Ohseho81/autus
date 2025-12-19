import asyncio
import json
import logging
import platform
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
import threading
from collections import defaultdict

import psutil
import aiohttp
from pydantic import BaseModel

# Platform-specific imports
if platform.system() == "Windows":
    try:
        import win32gui
        import win32process
    except ImportError:
        win32gui = None
        win32process = None
elif platform.system() == "Darwin":  # macOS
    try:
        from AppKit import NSWorkspace, NSApplication
        from Cocoa import NSRunLoop, NSDefaultRunLoopMode
    except ImportError:
        NSWorkspace = None
        NSApplication = None
        NSRunLoop = None
        NSDefaultRunLoopMode = None
elif platform.system() == "Linux":
    try:
        import gi
        gi.require_version('Gtk', '3.0')
        from gi.repository import Gtk, Gdk
    except ImportError:
        Gtk = None
        Gdk = None


@dataclass
class AppActivity:
    """Represents application activity data."""
    app_name: str
    window_title: str
    process_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'app_name': self.app_name,
            'window_title': self.window_title,
            'process_id': self.process_id,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration': self.duration
        }


@dataclass
class DesktopStats:
    """Desktop usage statistics."""
    total_time: float
    app_times: Dict[str, float]
    context_switches: int
    most_used_app: str
    current_app: Optional[str]
    session_start: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'total_time': self.total_time,
            'app_times': self.app_times,
            'context_switches': self.context_switches,
            'most_used_app': self.most_used_app,
            'current_app': self.current_app,
            'session_start': self.session_start.isoformat()
        }


class DesktopTracker:
    """Cross-platform desktop activity tracker."""
    
    def __init__(self, poll_interval: float = 1.0):
        self.poll_interval = poll_interval
        self.activities: List[AppActivity] = []
        self.current_activity: Optional[AppActivity] = None
        self.session_start = datetime.now()
        self.app_times: Dict[str, float] = defaultdict(float)
        self.context_switches = 0
        self.running = False
        self.logger = logging.getLogger(__name__)
        
    def get_active_window(self) -> Optional[tuple]:
        """Get active window information (app_name, window_title, process_id)."""
        try:
            if platform.system() == "Windows" and win32gui:
                return self._get_windows_active_window()
            elif platform.system() == "Darwin" and NSWorkspace:
                return self._get_macos_active_window()
            elif platform.system() == "Linux" and Gtk:
                return self._get_linux_active_window()
            else:
                return self._get_fallback_active_process()
        except Exception as e:
            self.logger.error(f"Error getting active window: {e}")
            return None
    
    def _get_windows_active_window(self) -> Optional[tuple]:
        """Get active window on Windows."""
        hwnd = win32gui.GetForegroundWindow()
        if hwnd:
            window_title = win32gui.GetWindowText(hwnd)
            _, process_id = win32process.GetWindowThreadProcessId(hwnd)
            try:
                process = psutil.Process(process_id)
                app_name = process.name()
                return app_name, window_title, process_id
            except psutil.NoSuchProcess:
                return None
        return None
    
    def _get_macos_active_window(self) -> Optional[tuple]:
        """Get active window on macOS."""
        workspace = NSWorkspace.sharedWorkspace()
        active_app = workspace.activeApplication()
        if active_app:
            app_name = active_app.get('NSApplicationName', 'Unknown')
            process_id = active_app.get('NSApplicationProcessIdentifier', 0)
            return app_name, app_name, process_id
        return None
    
    def _get_linux_active_window(self) -> Optional[tuple]:
        """Get active window on Linux."""
        try:
            display = Gdk.Display.get_default()
            if display:
                screen = display.get_default_screen()
                root = screen.get_root_window()
                window = display.get_default_group().get_current_window()
                if window:
                    window_title = window.get_name() or "Unknown"
                    # This is a simplified approach for Linux
                    return "Unknown", window_title, 0
        except Exception:
            pass
        return None
    
    def _get_fallback_active_process(self) -> Optional[tuple]:
        """Fallback method using psutil to get current process info."""
        try:
            current_process = psutil.Process()
            return current_process.name(), current_process.name(), current_process.pid
        except Exception:
            return None
    
    async def start_tracking(self):
        """Start tracking desktop activity."""
        self.running = True
        self.logger.info("Desktop tracking started")
        
        while self.running:
            try:
                window_info = self.get_active_window()
                current_time = datetime.now()
                
                if window_info:
                    app_name, window_title, process_id = window_info
                    
                    # Check if we need to create a new activity
                    if (not self.current_activity or 
                        self.current_activity.app_name != app_name or
                        self.current_activity.window_title != window_title):
                        
                        # End current activity
                        if self.current_activity:
                            self.current_activity.end_time = current_time
                            self.current_activity.duration = (
                                self.current_activity.end_time - self.current_activity.start_time
                            ).total_seconds()
                            self.app_times[self.current_activity.app_name] += self.current_activity.duration
                            self.activities.append(self.current_activity)
                            self.context_switches += 1
                        
                        # Start new activity
                        self.current_activity = AppActivity(
                            app_name=app_name,
                            window_title=window_title,
                            process_id=process_id,
                            start_time=current_time
                        )
                
                await asyncio.sleep(self.poll_interval)
                
            except Exception as e:
                self.logger.error(f"Error in tracking loop: {e}")
                await asyncio.sleep(self.poll_interval)
    
    def stop_tracking(self):
        """Stop tracking desktop activity."""
        self.running = False
        
        # End current activity
        if self.current_activity:
            self.current_activity.end_time = datetime.now()
            self.current_activity.duration = (
                self.current_activity.end_time - self.current_activity.start_time
            ).total_seconds()
            self.app_times[self.current_activity.app_name] += self.current_activity.duration
            self.activities.append(self.current_activity)
        
        self.logger.info("Desktop tracking stopped")
    
    def get_stats(self) -> DesktopStats:
        """Get current desktop usage statistics."""
        total_time = sum(self.app_times.values())
        most_used_app = max(self.app_times.items(), key=lambda x: x[1])[0] if self.app_times else "None"
        current_app = self.current_activity.app_name if self.current_activity else None
        
        return DesktopStats(
            total_time=total_time,
            app_times=dict(self.app_times),
            context_switches=self.context_switches,
            most_used_app=most_used_app,
            current_app=current_app,
            session_start=self.session_start
        )
    
    def export_data(self, filepath: str):
        """Export tracking data to JSON file."""
        data = {
            'session_start': self.session_start.isoformat(),
            'activities': [activity.to_dict() for activity in self.activities],
            'stats': self.get_stats().to_dict()
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        self.logger.info(f"Data exported to {filepath}")


async def main():
    """Main function to demonstrate desktop tracking."""
    logging.basicConfig(level=logging.INFO)
    
    tracker = DesktopTracker(poll_interval=2.0)
    
    try:
        # Start tracking in background
        tracking_task = asyncio.create_task(tracker.start_tracking())
        
        # Run for 30 seconds as demo
        await asyncio.sleep(30)
        
        # Stop tracking
        tracker.stop_tracking()
        tracking_task.cancel()
        
        # Print stats
        stats = tracker.get_stats()
        print("\nDesktop Usage Stats:")
        print(f"Total time: {stats.total_time:.2f} seconds")
        print(f"Context switches: {stats.context_switches}")
        print(f"Most used app: {stats.most_used_app}")
        print(f"Current app: {stats.current_app}")
        
        print("\nApp usage times:")
        for app, time_spent in stats.app_times.items():
            print(f"  {app}: {time_spent:.2f}s")
        
        # Export data
        tracker.export_data("desktop_activity.json")
        
    except KeyboardInterrupt:
        tracker.stop_tracking()
        print("\nTracking stopped by user")


if __name__ == "__main__":
    asyncio.run(main())