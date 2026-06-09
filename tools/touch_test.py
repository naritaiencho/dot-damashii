# タッチ操作レイヤー（js/touch.js）の検証テスト
# index.html?touch=1 を file:// で開き、touch.js を注入して検証する
import pathlib
import sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
TOUCH_JS = str(ROOT / "js" / "touch.js")
SHOT = ROOT / "tools" / "shots"
SHOT.mkdir(exist_ok=True)

results = []
errors = []


def check(name, cond):
    results.append((name, bool(cond)))
    print(("PASS" if cond else "FAIL"), "-", name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ============ ケース1: ?touch=1 あり → UI生成・動作 ============
    page = browser.new_page(viewport={"width": 932, "height": 430})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(URL + "?touch=1")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(600)

    # touch.js を注入（index.html にはまだ <script> タグが無い）
    page.add_script_tag(path=TOUCH_JS)
    page.wait_for_timeout(300)

    # --- ボタンDOMが生成されていること ---
    check("ルート #dtc-root が生成される", page.query_selector("#dtc-root") is not None)
    for bid in ["dtc-start", "dtc-back", "dtc-btn-left", "dtc-btn-right",
                "dtc-btn-jump", "dtc-btn-guard", "dtc-btn-light",
                "dtc-btn-heavy", "dtc-btn-special", "dtc-keypad"]:
        check(f"#{bid} が存在する", page.query_selector(f"#{bid}") is not None)

    # テンキーは netjoin 以外では非表示
    keypad_visible = page.evaluate(
        "getComputedStyle(document.getElementById('dtc-keypad')).display !== 'none'")
    check("テンキーはタイトルでは非表示", not keypad_visible)

    # --- スクリーンショット（タイトル + タッチUI） ---
    page.screenshot(path=str(SHOT / "touch_ui.png"))

    # --- STARTボタン click → title → select ---
    state0 = page.evaluate("window.GAME.state")
    check("初期状態は title", state0 == "title")
    page.click("#dtc-start")
    page.wait_for_timeout(500)
    state1 = page.evaluate("window.GAME.state")
    check("START押下で select へ遷移", state1 == "select")
    page.screenshot(path=str(SHOT / "touch_ui_select.png"))

    # --- 「弱」ボタンの pointerdown/up で Input.held("KeyJ") が切り替わる ---
    box = page.query_selector("#dtc-btn-light").bounding_box()
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    page.mouse.move(cx, cy)
    page.mouse.down()
    page.wait_for_timeout(100)
    held_down = page.evaluate("Input.held('KeyJ')")
    pressed_cls = page.evaluate(
        "document.getElementById('dtc-btn-light').classList.contains('dtc-pressed')")
    check("弱 pointerdown で Input.held('KeyJ') === true", held_down is True)
    check("弱 押下中は dtc-pressed クラスが付く", pressed_cls is True)
    page.mouse.up()
    page.wait_for_timeout(100)
    held_up = page.evaluate("Input.held('KeyJ')")
    check("弱 pointerup で Input.held('KeyJ') === false", held_up is False)

    # --- マルチタッチ相当: 移動(KeyD)押下中でも攻撃が独立 ---
    box_r = page.query_selector("#dtc-btn-right").bounding_box()
    page.mouse.move(box_r["x"] + box_r["width"] / 2, box_r["y"] + box_r["height"] / 2)
    page.mouse.down()
    page.wait_for_timeout(80)
    # 別ポインタ（タッチ）で弱ボタンを押す
    page.evaluate("""() => {
        const btn = document.getElementById('dtc-btn-light');
        const r = btn.getBoundingClientRect();
        const opts = {pointerId: 7, pointerType: 'touch', isPrimary: false,
                      clientX: r.x + r.width/2, clientY: r.y + r.height/2,
                      bubbles: true};
        btn.dispatchEvent(new PointerEvent('pointerdown', opts));
    }""")
    page.wait_for_timeout(80)
    both = page.evaluate("Input.held('KeyD') && Input.held('KeyJ')")
    check("マルチタッチ: KeyD 押下中に KeyJ も同時押し可能", both is True)
    page.evaluate("""() => {
        const btn = document.getElementById('dtc-btn-light');
        const r = btn.getBoundingClientRect();
        btn.dispatchEvent(new PointerEvent('pointerup', {pointerId: 7, pointerType: 'touch',
            clientX: r.x + r.width/2, clientY: r.y + r.height/2, bubbles: true}));
    }""")
    page.mouse.up()
    page.wait_for_timeout(80)
    released = page.evaluate("!Input.held('KeyD') && !Input.held('KeyJ')")
    check("マルチタッチ: 両方離すと両キー解放", released is True)
    # --- netjoin でテンキーが表示され、数字入力が効くこと ---
    # select画面 → もどる → ネットたいせん → あいことばで さんか
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    page.keyboard.press("KeyS"); page.wait_for_timeout(100)
    page.keyboard.press("KeyS"); page.wait_for_timeout(100)
    page.keyboard.press("Enter"); page.wait_for_timeout(400)
    page.keyboard.press("KeyS"); page.wait_for_timeout(100)
    page.keyboard.press("Enter"); page.wait_for_timeout(900)
    check("netjoin へ遷移", page.evaluate("window.GAME.state") == "netjoin")
    page.wait_for_timeout(500)  # 300msポーリング待ち
    keypad_shown = page.evaluate(
        "getComputedStyle(document.getElementById('dtc-keypad')).display === 'grid'")
    check("netjoin でテンキーが表示される", keypad_shown)
    for d in ["1", "2", "3", "4"]:
        page.click(f"#dtc-key-{d}")
        page.wait_for_timeout(120)
    check("テンキーで部屋コード入力できる", page.evaluate("window.GAME.netUI.joinInput") == "1234")
    page.click("#dtc-key-del")
    page.wait_for_timeout(150)
    check("⌫ で1文字削除できる", page.evaluate("window.GAME.netUI.joinInput") == "123")
    page.screenshot(path=str(SHOT / "touch_ui_netjoin.png"))
    page.close()

    # ============ ケース2: ?touch=1 なし（非タッチ環境）→ DOM非生成 ============
    page2 = browser.new_page(viewport={"width": 932, "height": 430})
    page2.goto(URL)
    page2.wait_for_load_state("networkidle")
    page2.wait_for_timeout(400)
    page2.add_script_tag(path=TOUCH_JS)
    page2.wait_for_timeout(200)
    check("?touch=1 なしではDOMを生成しない", page2.query_selector("#dtc-root") is None)
    check("?touch=1 なしでは<style>も注入しない", page2.query_selector("#dtc-style") is None)
    page2.close()

    browser.close()

print()
print("コンソールエラー:", len(errors))
for e in errors:
    print("  ERROR:", e)

failed = [n for n, ok in results if not ok]
print(f"\n結果: {len(results) - len(failed)}/{len(results)} PASS")
if failed or errors:
    sys.exit(1)
print("ALL PASS")
