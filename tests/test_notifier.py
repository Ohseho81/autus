from core.utils.notifier import Notifier

def test_notify_console_output(capsys):
    notifier = Notifier(template_dir="templates")
    notifier.notify("홍길동", "리스크", "치명적 리스크 발생")
    out = capsys.readouterr().out
    assert "홍길동" in out
    assert "리스크" in out
    assert "치명적 리스크" in out
