import React from 'react';

export function RiskSummaryWidget({ risks }) {
  return (
    <div className="widget">
      <h3>Risk Summary</h3>
      <ul>
        {risks.map(risk => (
          <li key={risk.name}>
            {risk.name} <span className={`severity ${risk.severity}`}>{risk.severity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
