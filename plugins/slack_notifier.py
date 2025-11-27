class SlackNotifier:
    def __init__(self, webhook_url):
        self.webhook_url = webhook_url

    def notify(self, message):
        import requests
        requests.post(self.webhook_url, json={"text": message})
