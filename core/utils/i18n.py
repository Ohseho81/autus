import json
import os

class I18N:
    def __init__(self, locale_dir="locales", default_lang="ko"):
        self.locale_dir = locale_dir
        self.default_lang = default_lang
        self.cache = {}

    def load(self, lang=None):
        lang = lang or self.default_lang
        if lang in self.cache:
            return self.cache[lang]
        path = os.path.join(self.locale_dir, f"{lang}.json")
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
                self.cache[lang] = data
                return data
        except Exception:
            return {}

    def t(self, key, lang=None):
        data = self.load(lang)
        return data.get(key, key)

global_i18n = I18N()
