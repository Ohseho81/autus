# Dashboard

React 기반 대시보드 및 위젯 컴포넌트 개발 공간입니다.

예시:

```jsx
function RiskSummaryWidget({ risks }) {
  return (
    <div className="widget">
      <h3>Risk Summary</h3>
      <ul>
        {risks.map(risk => (
          <li key={risk.id}>
            {risk.name} <span className={`severity ${risk.severity.toLowerCase()}`}>{risk.severity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

- React 기반 대시보드 위젯 샘플: `risk_summary_widget.jsx`
- 테스트용 mock 데이터: `mock_risks.json`

## 사용 예시

```jsx
import React from 'react';
import { RiskSummaryWidget } from './risk_summary_widget';
import risks from './mock_risks.json';

export default function Dashboard() {
  return <RiskSummaryWidget risks={risks} />;
}
```

## 확장 방향

- 실시간 데이터 연동(API)
- 사용자별 맞춤 위젯/테마
- 반응형 레이아웃 지원
