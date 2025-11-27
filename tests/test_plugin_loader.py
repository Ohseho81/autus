def test_load_and_run_slack_notifier(monkeypatch):
    from plugins import loader
    # requests.post를 모킹하여 외부 호출 방지
    class DummyRequests:
        def post(self, url, json):
            DummyRequests.called = True
            DummyRequests.last_url = url
            DummyRequests.last_json = json
            return type('Resp', (), {'status_code': 200})()
    monkeypatch.setitem(__import__('sys').modules, 'requests', DummyRequests())
    DummyRequests.called = False
    notifier = loader.run_plugin('slack_notifier', webhook_url='http://dummy')
    notifier.notify('테스트 메시지')
    assert DummyRequests.called
    assert DummyRequests.last_url == 'http://dummy'
    assert DummyRequests.last_json == {"text": "테스트 메시지"}
