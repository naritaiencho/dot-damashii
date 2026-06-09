# ゲームフロー E2E テスト（タイトル→選択→VS→バトル）
import pathlib
import sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
SHOT = ROOT / "tools" / "shots"
SHOT.mkdir(exist_ok=True)

errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 760})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)

    # ロスター読み込み確認
    n = page.evaluate("window.DOT_FIGHTERS ? window.DOT_FIGHTERS.length : -1")
    print(f"ロスター: {n}体")

    page.screenshot(path=str(SHOT / "01_title.png"))

    # タイトル → キャラ選択（ひとりであそぶ）
    page.keyboard.press("Enter")
    page.wait_for_timeout(600)
    page.screenshot(path=str(SHOT / "02_select.png"))

    # P1キャラ決定 → CPUルーレット
    page.keyboard.press("KeyJ")
    page.wait_for_timeout(1900)  # cpu(50f)+done(36f)+vs突入
    page.screenshot(path=str(SHOT / "03_vs.png"))

    # VS画面 → バトルへ（150f待つ）
    page.wait_for_timeout(2600)
    page.screenshot(path=str(SHOT / "04_battle_intro.png"))

    # FIGHT! 後に操作してみる
    page.wait_for_timeout(1500)
    page.keyboard.down("KeyD")
    page.wait_for_timeout(700)
    page.keyboard.up("KeyD")
    page.keyboard.press("KeyJ")
    page.wait_for_timeout(300)
    page.keyboard.press("KeyK")
    page.wait_for_timeout(400)
    page.screenshot(path=str(SHOT / "05_battle_action.png"))

    # しばらく戦わせる（CPUも動く）
    for _ in range(6):
        page.keyboard.press("KeyJ")
        page.wait_for_timeout(250)
        page.keyboard.press("KeyK")
        page.wait_for_timeout(350)
    page.screenshot(path=str(SHOT / "06_battle_later.png"))

    # ゲーム内状態を確認
    state = page.evaluate("document.title")
    browser.close()

print("コンソールエラー:", len(errors))
for e in errors:
    print("  ERROR:", e)
sys.exit(1 if errors else 0)
