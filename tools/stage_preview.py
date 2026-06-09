# 新ステージ背景プレビュー（Stages.list の canvas を toDataURL で取り出して保存）
import base64
import pathlib
import sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
SHOT = ROOT / "tools" / "shots"
SHOT.mkdir(exist_ok=True)

TARGETS = [(3, "stage_arcade.png"), (4, "stage_onsen.png")]

errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 760})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)

    names = page.evaluate("Stages.list.map(s => s.name)")
    print("ステージ一覧:", names)

    for idx, fname in TARGETS:
        data_url = page.evaluate("(i) => Stages.list[i].canvas.toDataURL('image/png')", idx)
        png = base64.b64decode(data_url.split(",", 1)[1])
        (SHOT / fname).write_bytes(png)
        print("保存:", fname, f"({len(png)} bytes)")

    browser.close()

print("コンソールエラー:", len(errors))
for e in errors:
    print("  ERROR:", e)
sys.exit(1 if errors else 0)
