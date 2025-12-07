"""
Performance Benchmark & Analysis Report Generator

Generates comprehensive performance reports from monitoring data
"""

from typing import Dict, List, Any
from datetime import datetime, timedelta
import json
from pathlib import Path


class PerformanceReport:
    """Generate performance analysis reports"""
    
    def __init__(self, monitoring_data: Dict[str, Any]):
        self.data = monitoring_data
        self.timestamp = datetime.now()
    
    def get_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        summary = self.data.get('summary', {})
        
        return {
            'timestamp': self.timestamp.isoformat(),
            'total_endpoints': summary.get('total_endpoints', 0),
            'total_requests': summary.get('total_requests', 0),
            'error_rate': summary.get('error_rate', 0),
            'avg_response_time_ms': summary.get('avg_response_time_ms', 0),
            'uptime': summary.get('uptime_human', '-'),
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get detailed performance metrics"""
        slow_endpoints = self.data.get('slow_endpoints', [])
        
        if not slow_endpoints:
            return {
                'slowest': [],
                'fastest': [],
                'p50_ms': 0,
                'p95_ms': 0,
                'p99_ms': 0
            }
        
        # Calculate percentiles
        durations = [ep.get('avg_duration_ms', 0) for ep in slow_endpoints]
        durations.sort()
        
        def percentile(data, p):
            if not data:
                return 0
            idx = int(len(data) * p / 100)
            return data[idx] if idx < len(data) else data[-1]
        
        return {
            'slowest': slow_endpoints[:5],
            'fastest': slow_endpoints[-5:] if len(slow_endpoints) > 5 else [],
            'p50_ms': percentile(durations, 50),
            'p95_ms': percentile(durations, 95),
            'p99_ms': percentile(durations, 99),
            'total_endpoints_measured': len(slow_endpoints)
        }
    
    def get_reliability_metrics(self) -> Dict[str, Any]:
        """Get reliability and error metrics"""
        summary = self.data.get('summary', {})
        error_endpoints = self.data.get('error_endpoints', [])
        status_codes = self.data.get('status_codes', {})
        
        return {
            'error_rate_percent': summary.get('error_rate', 0),
            'total_errors': summary.get('total_errors', 0),
            'total_requests': summary.get('total_requests', 0),
            'endpoints_with_errors': len(error_endpoints),
            'most_common_errors': error_endpoints[:5] if error_endpoints else [],
            'status_code_distribution': status_codes.get('by_category', {})
        }
    
    def generate_html_report(self, output_path: str = "reports/performance_report.html"):
        """Generate HTML performance report"""
        
        summary = self.get_summary()
        perf = self.get_performance_metrics()
        reliability = self.get_reliability_metrics()
        
        html_content = f'''<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Performance Report</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
            background: #f5f5f5;
            padding: 20px;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 40px;
        }}
        
        .header {{
            border-bottom: 2px solid #3498db;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        
        .header h1 {{
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .header p {{
            color: #7f8c8d;
            font-size: 1.1em;
        }}
        
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .metric-card {{
            background: #ecf0f1;
            border-left: 4px solid #3498db;
            padding: 20px;
            border-radius: 4px;
        }}
        
        .metric-card h3 {{
            color: #2c3e50;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }}
        
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }}
        
        section {{
            margin-bottom: 40px;
        }}
        
        section h2 {{
            color: #2c3e50;
            border-bottom: 1px solid #ecf0f1;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        
        .table-container {{
            overflow-x: auto;
            border-radius: 4px;
            border: 1px solid #ecf0f1;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        th {{
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }}
        
        td {{
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
        }}
        
        tr:hover {{
            background: #f8f9fa;
        }}
        
        .status-good {{ color: #27ae60; }}
        .status-warning {{ color: #f39c12; }}
        .status-critical {{ color: #e74c3c; }}
        
        .footer {{
            text-align: right;
            color: #95a5a6;
            font-size: 0.9em;
            margin-top: 40px;
            border-top: 1px solid #ecf0f1;
            padding-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 API Performance Report</h1>
            <p>Generated: {summary['timestamp']}</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Total Endpoints</h3>
                <div class="metric-value">{summary['total_endpoints']}</div>
            </div>
            
            <div class="metric-card">
                <h3>Total Requests</h3>
                <div class="metric-value">{summary['total_requests']:,}</div>
            </div>
            
            <div class="metric-card">
                <h3>Avg Response Time</h3>
                <div class="metric-value">{summary['avg_response_time_ms']:.2f}ms</div>
            </div>
            
            <div class="metric-card">
                <h3>Error Rate</h3>
                <div class="metric-value status-{'good' if summary['error_rate'] < 1 else 'warning' if summary['error_rate'] < 5 else 'critical'}">
                    {summary['error_rate']:.2f}%
                </div>
            </div>
        </div>
        
        <section>
            <h2>🚀 Performance Metrics</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>P50 (Median)</h3>
                    <div class="metric-value">{perf['p50_ms']:.2f}ms</div>
                </div>
                <div class="metric-card">
                    <h3>P95</h3>
                    <div class="metric-value">{perf['p95_ms']:.2f}ms</div>
                </div>
                <div class="metric-card">
                    <h3>P99</h3>
                    <div class="metric-value">{perf['p99_ms']:.2f}ms</div>
                </div>
                <div class="metric-card">
                    <h3>Endpoints Measured</h3>
                    <div class="metric-value">{perf['total_endpoints_measured']}</div>
                </div>
            </div>
            
            <h3 style="margin-top: 20px; color: #2c3e50;">Slowest Endpoints</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Endpoint</th>
                            <th>Calls</th>
                            <th>Avg (ms)</th>
                            <th>Min (ms)</th>
                            <th>Max (ms)</th>
                        </tr>
                    </thead>
                    <tbody>
'''
        
        for ep in perf.get('slowest', [])[:5]:
            html_content += f'''
                        <tr>
                            <td>{ep.get('key', 'N/A')}</td>
                            <td>{ep.get('call_count', 0)}</td>
                            <td>{ep.get('avg_duration_ms', 0):.2f}</td>
                            <td>{ep.get('min_duration_ms', 0):.2f}</td>
                            <td>{ep.get('max_duration_ms', 0):.2f}</td>
                        </tr>
'''
        
        html_content += '''
                    </tbody>
                </table>
            </div>
        </section>
        
        <section>
            <h2>🛡️ Reliability Metrics</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>Error Rate</h3>
                    <div class="metric-value status-''' + ('good' if reliability['error_rate_percent'] < 1 else 'warning' if reliability['error_rate_percent'] < 5 else 'critical') + f'''">
                        {reliability['error_rate_percent']:.2f}%
                    </div>
                </div>
                <div class="metric-card">
                    <h3>Total Errors</h3>
                    <div class="metric-value">{reliability['total_errors']}</div>
                </div>
                <div class="metric-card">
                    <h3>Endpoints with Errors</h3>
                    <div class="metric-value">{reliability['endpoints_with_errors']}</div>
                </div>
            </div>
            
            <h3 style="margin-top: 20px; color: #2c3e50;">Status Code Distribution</h3>
            <div class="metrics-grid">
'''
        
        for category, count in reliability.get('status_code_distribution', {}).items():
            html_content += f'''
                <div class="metric-card">
                    <h3>{category}</h3>
                    <div class="metric-value">{count:,}</div>
                </div>
'''
        
        html_content += '''
            </div>
        </section>
        
        <div class="footer">
            <p>📈 AUTUS API Performance Report</p>
            <p style="margin-top: 5px; font-size: 0.8em;">This report was automatically generated</p>
        </div>
    </div>
</body>
</html>
'''
        
        # Save report
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✅ Report generated: {output_path}")
        return str(output_file)
    
    def generate_json_report(self, output_path: str = "reports/performance_report.json"):
        """Generate JSON report"""
        
        report_data = {
            'timestamp': self.timestamp.isoformat(),
            'summary': self.get_summary(),
            'performance': self.get_performance_metrics(),
            'reliability': self.get_reliability_metrics()
        }
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        print(f"✅ JSON report generated: {output_path}")
        return str(output_file)
    
    def generate_text_report(self) -> str:
        """Generate text report"""
        
        summary = self.get_summary()
        perf = self.get_performance_metrics()
        reliability = self.get_reliability_metrics()
        
        report = f"""
╔════════════════════════════════════════════════════════════════════════════╗
║                    📊 API PERFORMANCE REPORT                             ║
║                                                                            ║
║ Generated: {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}                                ║
╚════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Endpoints:       {summary['total_endpoints']}
  Total Requests:        {summary['total_requests']:,}
  Avg Response Time:     {summary['avg_response_time_ms']:.2f}ms
  Error Rate:            {summary['error_rate']:.2f}%
  Uptime:                {summary['uptime']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 PERFORMANCE METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  P50 (Median):          {perf['p50_ms']:.2f}ms
  P95:                   {perf['p95_ms']:.2f}ms
  P99:                   {perf['p99_ms']:.2f}ms

  Slowest Endpoints:
"""
        
        for i, ep in enumerate(perf.get('slowest', [])[:5], 1):
            report += f"    {i}. {ep.get('key', 'N/A')}: {ep.get('avg_duration_ms', 0):.2f}ms\n"
        
        report += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️  RELIABILITY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Error Rate:            {reliability['error_rate_percent']:.2f}%
  Total Errors:          {reliability['total_errors']}
  Endpoints with Errors: {reliability['endpoints_with_errors']}

  Status Code Distribution:
"""
        
        for category, count in reliability.get('status_code_distribution', {}).items():
            report += f"    {category}: {count:,}\n"
        
        report += "\n" + "━" * 80 + "\n"
        
        return report


if __name__ == "__main__":
    # Example usage
    sample_data = {
        'summary': {
            'total_endpoints': 270,
            'total_requests': 10000,
            'error_rate': 0.5,
            'avg_response_time_ms': 45.2,
            'uptime_human': '2d 5h'
        },
        'slow_endpoints': [],
        'error_endpoints': [],
        'status_codes': {'by_category': {}}
    }
    
    report = PerformanceReport(sample_data)
    print(report.generate_text_report())
