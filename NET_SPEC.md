# ドット魂 オンライン対戦 通信モジュール仕様書 (js/net.js)

PeerJS (WebRTC) を使った1対1通信モジュール。グローバル `Net` として公開する。

## 前提

- `index.html` で PeerJS v1 がCDN読み込み済み（グローバル `Peer` が存在する）。net.js 内でCDN読み込みはしない
- ブラウザ直読みの純粋JS（import/export禁止）。`const Net = (() => { ... })();` 形式のIIFE
- PeerJS のデフォルトクラウドブローカー（0.peerjs.com）を使う。独自サーバー設定は不要
- DataChannel は reliable（PeerJSの `{ reliable: true }`）

## ルームコード

- 4桁の数字（例: "4271"）。PeerJS のピアIDは `"dotdama87-" + code`
- ホスト側でIDが既に使用中（error type `unavailable-id`）なら別のコードを自動再生成（最大5回）

## API

```js
Net.host(cb)
// 部屋を作る。コード生成 → peer登録 → cb("code", "4271") を発火
// ゲストが接続してDataChannelが開いたら cb("connected")

Net.join(code, cb)
// "dotdama87-" + code に接続。開通したら cb("connected")
// 相手が見つからない（peer-unavailable）等は cb("error", "メッセージ")

// cb(event, data) で発火するイベント:
//   "code"      data=コード文字列（ホストのみ、部屋準備完了）
//   "connected" data=なし（双方）
//   "data"      data=受信したオブジェクト（内部処理されるものを除く全メッセージ）
//   "error"     data=日本語のエラーメッセージ文字列
//   "closed"    data=なし（相手切断・接続喪失）

Net.send(obj)        // JSONオブジェクト送信（未接続時は無視）
Net.connected        // bool（getter）
Net.isHost           // bool（getter）
Net.rtt              // number|null ms（getter、内部で2秒ごとにping/pong往復を自動計測）
Net.close()          // 完全切断・Peer破棄・内部状態リセット（再利用可能にする）
```

## ロックステップ入力API

毎フレームの入力ビットマスクを交換するための専用レーン。

```js
Net.sendInput(frame, bits)  // {t:"i", f:frame, b:bits} を送信し、即return
Net.getInput(frame)         // 相手から受信済みの該当フレームの bits（number）を返す。未着なら null
Net.clearInputs()           // 入力バッファ全消去（バトル開始時に呼ばれる）
```

- 受信した `{t:"i"}` は内部バッファに格納し、**cb("data") には流さない**
- `{t:"ping"}` `{t:"pong"}` も内部処理（rtt計測）し、cb には流さない
- それ以外のメッセージ（`{t:"sel"}` 等）はすべて cb("data", obj) に流す
- メモリリーク防止: 受信入力バッファは「最後に getInput されたフレーム − 300」より古いエントリを適宜削除

## エラーメッセージ（日本語で）

- 相手が見つからない: 「へやが みつかりません」
- 接続失敗・切断: 「つうしんが きれました」
- PeerJS未ロード（`typeof Peer === "undefined"`）: 「つうしんモジュールが よみこめません（インターネットせつぞくを かくにんしてください）」

## 検証

`tools/net_smoke.py`（Playwright・Python）を作成して実行し、PASSするまで修正すること:

1. 2つのページで `index.html`（file://）を開く
2. 両ページで `window._ev = []` を用意し、page1 で `Net.host((e,d)=>window._ev.push([e,d]))` を実行
3. page1 の `_ev` から "code" イベントをポーリング取得
4. page2 で `Net.join(code, ...)` → 両ページが "connected" になるのを確認
5. page1 → `Net.send({t:"msg", x: 42})` → page2 の `_ev` に "data" として届くこと
6. page1 → `Net.sendInput(10, 99)` → page2 の `Net.getInput(10) === 99` になること（未着フレーム `Net.getInput(11) === null` も確認）
7. `Net.rtt` が数秒後に number になること
8. page2 を close → page1 に "closed" イベントが届くこと
9. コンソールエラー（page error）が0件であること

※ PeerJSクラウドへの接続にインターネットが必要。タイムアウトは長め（20秒）に取ること。
