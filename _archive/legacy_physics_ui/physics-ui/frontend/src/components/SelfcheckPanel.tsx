/**
 * Selfcheck Panel
 * 
 * Action 후 60초 윈도우 내에서 자기평가 제출
 * 6개 슬라이더: alignment, clarity, friction, momentum, confidence, recovery
 */

import { useState, useCallback } from "react";
import type { SelfcheckSubmitRequest } from "../api/viewTypes";
import "../styles/selfcheck.css";

type Props = {
  windowRemaining: number;  // 남은 시간 (초)
  onSubmit: (data: Omit<SelfcheckSubmitRequest, "client_ts">) => Promise<void>;
  disabled?: boolean;
};

type SliderConfig = {
  key: keyof Omit<SelfcheckSubmitRequest, "client_ts">;
  label: string;
  description: string;
};

const SLIDERS: SliderConfig[] = [
  { key: "alignment", label: "A", description: "정렬감" },
  { key: "clarity", label: "C", description: "명확함" },
  { key: "friction", label: "F", description: "마찰감" },
  { key: "momentum", label: "M", description: "추진감" },
  { key: "confidence", label: "Co", description: "확신감" },
  { key: "recovery", label: "R", description: "회복감" },
];

export function SelfcheckPanel({ windowRemaining, onSubmit, disabled }: Props) {
  const [values, setValues] = useState<Record<string, number>>({
    alignment: 0.5,
    clarity: 0.5,
    friction: 0.5,
    momentum: 0.5,
    confidence: 0.5,
    recovery: 0.5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback((key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted || windowRemaining <= 0) return;
    
    setSubmitting(true);
    try {
      await onSubmit({
        alignment: values.alignment,
        clarity: values.clarity,
        friction: values.friction,
        momentum: values.momentum,
        confidence: values.confidence,
        recovery: values.recovery,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [values, onSubmit, submitting, submitted, windowRemaining]);

  // 윈도우가 닫히면 리셋
  if (windowRemaining <= 0 && !submitted) {
    return null;
  }

  // 이미 제출됨
  if (submitted) {
    return (
      <div className="selfcheckPanel submitted">
        <div className="submittedMessage">✓ Selfcheck 제출됨</div>
      </div>
    );
  }

  const progressPct = (windowRemaining / 60) * 100;

  return (
    <div className="selfcheckPanel">
      {/* 타이머 바 */}
      <div className="timerBar">
        <div className="timerFill" style={{ width: `${progressPct}%` }} />
        <span className="timerText">{windowRemaining}s</span>
      </div>

      {/* 슬라이더들 */}
      <div className="sliders">
        {SLIDERS.map(({ key, label, description }) => (
          <div key={key} className="sliderRow">
            <div className="sliderLabel" title={description}>{label}</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={values[key]}
              onChange={(e) => handleChange(key, parseFloat(e.target.value))}
              disabled={disabled || submitting}
              className="slider"
            />
            <div className="sliderValue">{Math.round(values[key] * 100)}</div>
          </div>
        ))}
      </div>

      {/* 제출 버튼 */}
      <button
        className="submitBtn"
        onClick={handleSubmit}
        disabled={disabled || submitting || windowRemaining <= 0}
      >
        {submitting ? "..." : "SUBMIT"}
      </button>
    </div>
  );
}


