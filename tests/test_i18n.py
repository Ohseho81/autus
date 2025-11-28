import pytest
from packs.utils.i18n import I18N

def test_i18n_ko():
    i18n = I18N(locale_dir="locales", default_lang="ko")
    assert i18n.t("greeting") == "안녕하세요, AUTUS입니다!"
    assert i18n.t("dashboard") == "대시보드"

def test_i18n_en():
    i18n = I18N(locale_dir="locales", default_lang="en")
    assert i18n.t("greeting") == "Hello, this is AUTUS!"
    assert i18n.t("dashboard") == "Dashboard"

def test_i18n_fallback():
    i18n = I18N(locale_dir="locales", default_lang="ko")
    assert i18n.t("not_exist_key") == "not_exist_key"
