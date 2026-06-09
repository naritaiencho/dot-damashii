# net.js 疎通テスト（NET_SPEC.md 検証手順どおり）
# 2ページ間で PeerJS クラウド経由の実 WebRTC 接続を張って確認する。
# 実行: python tools/net_smoke.py  （要インターネット接続）
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
NET_JS = ROOT / "js" / "net.js"
PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"

TIMEOUT = 20000  # PeerJSクラウド接続待ち（ms）

results = []  # (name, ok, detail)


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))


def setup_page(p, browser, label):
    page = browser.new_page()
    errors = []
    page.on("console", lambda m: errors.append(f"{label} console: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"{label} pageerror: {e}"))
    page.goto(URL)
    page.wait_for_load_state("load")
    # index.html に PeerJS / net.js がまだ無い場合はテスト側で注入する
    if page.evaluate("typeof Peer === 'undefined'"):
        page.add_script_tag(url=PEERJS_CDN)
    if page.evaluate("typeof Net === 'undefined'"):
        page.add_script_tag(path=str(NET_JS))
    page.evaluate("window._ev = []")
    return page, errors


def wait_event(page, name, timeout=TIMEOUT):
    """_ev に指定イベントが積まれるまで待ち、その data を返す"""
    page.wait_for_function(
        f"window._ev.some(x => x[0] === {json.dumps(name)})", timeout=timeout
    )
    return page.evaluate(
        f"window._ev.filter(x => x[0] === {json.dumps(name)}).map(x => x[1])"
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page1, err1 = setup_page(p, browser, "page1")
        page2, err2 = setup_page(p, browser, "page2")

        # --- 2,3. host → "code" イベント取得 ---
        page1.evaluate(
            "Net.host((e, d) => window._ev.push([e, d === undefined ? null : d]))"
        )
        try:
            codes = wait_event(page1, "code")
            code = codes[0]
            ok = isinstance(code, str) and len(code) == 4 and code.isdigit()
            check("host: 'code' イベント（4桁コード）", ok, f"code={code!r}")
        except Exception as e:
            check("host: 'code' イベント（4桁コード）", False, str(e))
            print("以降のテストを中断します")
            browser.close()
            return finish(err1, err2, aborted=True)

        # --- 4. join → 双方 "connected" ---
        page2.evaluate(
            f"Net.join({json.dumps(code)}, (e, d) => window._ev.push([e, d === undefined ? null : d]))"
        )
        try:
            wait_event(page2, "connected")
            wait_event(page1, "connected")
            both = page1.evaluate("Net.connected") and page2.evaluate("Net.connected")
            check("join: 双方 'connected'（Net.connected=true）", bool(both))
        except Exception as e:
            check("join: 双方 'connected'（Net.connected=true）", False, str(e))
            browser.close()
            return finish(err1, err2, aborted=True)

        # isHost の整合
        check(
            "isHost: page1=true / page2=false",
            page1.evaluate("Net.isHost") is True
            and page2.evaluate("Net.isHost") is False,
        )

        # --- 5. send → 相手の "data" イベント ---
        page1.evaluate("Net.send({t:'msg', x:42})")
        try:
            page2.wait_for_function(
                "window._ev.some(x => x[0]==='data' && x[1] && x[1].t==='msg' && x[1].x===42)",
                timeout=TIMEOUT,
            )
            check("send: {t:'msg',x:42} が page2 に 'data' で届く", True)
        except Exception as e:
            check("send: {t:'msg',x:42} が page2 に 'data' で届く", False, str(e))

        # --- 6. sendInput / getInput ---
        page1.evaluate("Net.sendInput(10, 99)")
        try:
            page2.wait_for_function("Net.getInput(10) === 99", timeout=TIMEOUT)
            check("sendInput: page2.getInput(10) === 99", True)
        except Exception as e:
            check("sendInput: page2.getInput(10) === 99", False, str(e))
        check(
            "getInput: 未着フレーム getInput(11) === null",
            page2.evaluate("Net.getInput(11)") is None,
        )
        # {t:'i'} が cb('data') に流れていないこと
        leaked = page2.evaluate(
            "window._ev.filter(x => x[0]==='data' && x[1] && (x[1].t==='i'||x[1].t==='ping'||x[1].t==='pong')).length"
        )
        check("内部メッセージ(i/ping/pong)が 'data' に流れない", leaked == 0)

        # --- 7. rtt が number になる（pingは2秒間隔） ---
        try:
            page1.wait_for_function("typeof Net.rtt === 'number'", timeout=10000)
            rtt = page1.evaluate("Net.rtt")
            check("rtt: 数秒後に number になる", True, f"rtt={rtt}ms")
        except Exception as e:
            check("rtt: 数秒後に number になる", False, str(e))

        # --- 8. page2 close → page1 に "closed" ---
        page2.close()
        try:
            page1.wait_for_function(
                "window._ev.some(x => x[0]==='closed')", timeout=25000
            )
            check("close: 相手切断で 'closed' イベント", True)
        except Exception as e:
            check("close: 相手切断で 'closed' イベント", False, str(e))

        browser.close()
        return finish(err1, err2)


def finish(err1, err2, aborted=False):
    # --- 9. コンソールエラー / pageerror 0件 ---
    all_errs = err1 + err2
    check("コンソールエラー（page error）0件", len(all_errs) == 0,
          "; ".join(all_errs[:5]) if all_errs else "")

    print()
    failed = [r for r in results if not r[1]]
    total = len(results)
    print(f"結果: {total - len(failed)}/{total} PASS" + ("（中断あり）" if aborted else ""))
    if failed or aborted:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
