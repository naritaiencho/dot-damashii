# 公開URLの動作確認
import sys
from playwright.sync_api import sync_playwright

URL = "https://naritaiencho.github.io/dot-damashii/"
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 760})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1200)
    n = page.evaluate("window.DOT_FIGHTERS ? window.DOT_FIGHTERS.length : -1")
    peer = page.evaluate("typeof Peer !== 'undefined'")
    state = page.evaluate("GAME.state")
    page.screenshot(path="tools/shots/pages_live.png")
    browser.close()

print(f"ロスター: {n}体 / PeerJS: {peer} / state: {state} / エラー: {len(errors)}")
for e in errors:
    print("  ERROR:", e)
sys.exit(0 if (n == 4 and peer and not errors) else 1)
