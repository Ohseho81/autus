from flask import Flask, render_template_string, send_from_directory
import os

dashboard = Flask(__name__)

REPORT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../reports'))

@dashboard.route('/')
def index():
    # 최신 상태/커버리지/테스트 제안 리포트 파일 목록
    reports = sorted([f for f in os.listdir(REPORT_DIR) if f.endswith('.md')], reverse=True)
    return render_template_string('''
    <h1>AUTUS 대시보드</h1>
    <h2>리포트 목록</h2>
    <ul>
    {% for r in reports %}
      <li><a href="/report/{{r}}">{{r}}</a></li>
    {% endfor %}
    </ul>
    ''', reports=reports)

@dashboard.route('/report/<path:filename>')
def report(filename):
    # Markdown 파일을 HTML로 변환하여 보여줌 (간단 변환)
    try:
        import markdown
    except ImportError:
        return send_from_directory(REPORT_DIR, filename)
    with open(os.path.join(REPORT_DIR, filename), encoding='utf-8') as f:
        md = f.read()
    html = markdown.markdown(md)
    return f'<a href="/">← 목록</a><hr>' + html

if __name__ == '__main__':
    dashboard.run(host='0.0.0.0', port=8080, debug=True)
