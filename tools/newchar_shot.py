# 新キャラ（雷電 vs シノブ）のビジュアル確認用スクリーンショット
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
SHOT = ROOT / "tools" / "shots"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 760})
    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(600)

    # 2Pモードでキャラを直接指定
    page.keyboard.press("KeyS")
    page.wait_for_timeout(200)
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)
    page.screenshot(path=str(SHOT / "v2_select6.png"))  # 6キャラ選択画面

    page.evaluate("GAME.sel.p1 = 4")  # raiden
    page.keyboard.press("KeyJ")
    page.wait_for_timeout(300)
    page.evaluate("GAME.sel.p2 = 5")  # shinobu
    page.keyboard.press("Comma")
    page.wait_for_timeout(900)
    page.screenshot(path=str(SHOT / "v2_vs.png"))

    page.keyboard.press("Enter")  # VSスキップ
    page.wait_for_timeout(2300)   # intro終了

    # 接近して攻撃の絵を作る
    page.keyboard.down("KeyD")
    page.wait_for_timeout(800)
    page.keyboard.up("KeyD")
    page.keyboard.press("KeyK")
    page.wait_for_timeout(350)
    page.screenshot(path=str(SHOT / "v2_battle.png"))

    # シノブの必殺技（音符ビーム）を直接発動
    page.evaluate("() => { const b = GAME.battle; b.f2.meter = 100; }")
    page.keyboard.press("Slash")  # 2P必殺
    page.wait_for_timeout(500)
    page.screenshot(path=str(SHOT / "v2_special.png"))
    browser.close()

print("撮影完了")
