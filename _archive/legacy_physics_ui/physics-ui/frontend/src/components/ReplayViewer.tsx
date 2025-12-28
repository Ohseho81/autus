/**
 * Replay Viewer
 * 
 * 이벤트 히스토리를 시각화하는 패널
 * - 이벤트 타임라인 표시
 * - 이벤트 타입별 아이콘/색상
 * - 시간순 정렬
 */

import { useState, useEffect, useCallback } from "react";
import { ApiError } from "../api/physics";
import { httpJson } from "../api/client";
import "../styles/replay.css";

const API_BASE = import.meta.env?.VITE_API_BASE ?? "";

type ReplayEvent = {
  type: string;
  payload: Record<string, unknown>;
  ts: string;
};

type ReplayEventsResponse = {
  events: ReplayEvent[];
  count: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const EVENT_ICONS: Record<string, string> = {
  action_apply: "⚡",
  selfcheck_submit: "✓",
  state_reset: "↺",
  goal_set: "◎",
  view: "👁",
};

const EVENT_LABELS: Record<string, string> = {
  action_apply: "Action",
  selfcheck_submit: "Selfcheck",
  state_reset: "Reset",
  goal_set: "Goal",
  view: "View",
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPayload(payload: Record<string, unknown>): string {
  if (payload.action) return String(payload.action);
  if (payload.a !== undefined) {
    return `A:${Math.round(Number(payload.a) * 100)}`;
  }
  if (payload.mode) return String(payload.mode);
  return "";
}

export function ReplayViewer({ isOpen, onClose }: Props) {
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await httpJson<ReplayEventsResponse>(`${API_BASE}/replay/events`);
      // Filter out 'view' events for cleaner display
      const filtered = data.events.filter(e => e.type !== "view");
      setEvents(filtered.reverse()); // Most recent first
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("이벤트 로드 실패");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen, fetchEvents]);

  if (!isOpen) return null;

  return (
    <div className="replayOverlay" onClick={onClose}>
      <div className="replayPanel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="replayHeader">
          <span className="replayTitle">Event History</span>
          <button className="closeBtn" onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div className="replayContent">
          {loading && <div className="replayLoading">Loading...</div>}
          
          {error && <div className="replayError">{error}</div>}
          
          {!loading && !error && events.length === 0 && (
            <div className="replayEmpty">이벤트 없음</div>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="eventList">
              {events.map((event, idx) => (
                <div key={idx} className={`eventItem ${event.type}`}>
                  <div className="eventIcon">
                    {EVENT_ICONS[event.type] || "•"}
                  </div>
                  <div className="eventInfo">
                    <div className="eventType">
                      {EVENT_LABELS[event.type] || event.type}
                      {formatPayload(event.payload) && (
                        <span className="eventPayload">
                          {formatPayload(event.payload)}
                        </span>
                      )}
                    </div>
                    <div className="eventTime">{formatTime(event.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="replayFooter">
          <span className="eventCount">{events.length} events</span>
          <button className="refreshBtn" onClick={fetchEvents} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}


