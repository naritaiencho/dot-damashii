# ドット魂 〜昭和激闘伝〜 キャラクターデータ仕様書 v1

対戦格闘ゲーム「ドット魂」のキャラクターデータファイル仕様。
キャラクターファイルは `js/characters/<id>.js` に配置する。**純粋なJSファイル**（ES5互換、import/export禁止、ブラウザで`<script>`直読み込み）。

## ファイルの基本構造

```js
window.DOT_FIGHTERS = window.DOT_FIGHTERS || [];
window.DOT_FIGHTERS.push({
  id: "jiro",                 // 英小文字・数字・アンダースコアのみ
  name: "ヤキトリ次郎",        // 表示名（日本語OK）
  title: "炎の屋台番長",       // 肩書き
  catchphrase: "一本いっとくかい？",  // 登場時セリフ
  winQuote: "まだまだ焼きが足りねぇな！",  // 勝利セリフ
  themeColor: "#ff6a00",      // テーマカラー（HUDで使用）
  palette: { /* 後述 */ },
  frames: { /* 後述 */ },
  stats: { /* 後述 */ },
  moves: { /* 後述 */ },
  sfxProfile: { attack: "punch", special: "fire" }
});
```

## palette（パレット）

- キーは**1文字**（英数字。`.` は透明予約なので使用禁止）
- 値は `#rrggbb` 形式の6桁hex
- 色数は **8〜16色** 推奨。必ず「暗いアウトライン色」を1色含めること

```js
palette: {
  "o": "#1a1024",  // アウトライン（必須級）
  "s": "#f0c8a0",  // 肌
  "r": "#d83020",  // 赤
  ...
}
```

## frames（スプライトフレーム）

- 各フレームは **48行の文字列の配列**。各行は **ちょうど48文字**
- 使える文字は palette のキー、または `.`（透明）
- キャラは**右向き**で描く（左向きはエンジンが自動反転）
- 足元は **44〜47行目** あたりに接地。横方向はだいたい中央（10〜38列）に収める
- 必須フレームと枚数：

| キー      | 枚数 | 内容 |
|-----------|------|------|
| `idle`    | 2    | 立ちポーズ。呼吸で上下1pxずれる程度の差分 |
| `walk`    | 2    | 歩き。足が交互に出る |
| `light`   | 2    | 弱攻撃（ジャブ等、素早い）。[0]=予備動作 [1]=攻撃が前に伸びた絵 |
| `heavy`   | 2    | 強攻撃（大振り）。[0]=振りかぶり [1]=フルスイング |
| `special` | 2    | 必殺技ポーズ。[0]=溜め [1]=発動（派手に！） |
| `hit`     | 1    | のけぞり |
| `guard`   | 1    | ガード（腕で防御） |
| `jump`    | 1    | ジャンプ中（膝を曲げる等） |
| `ko`      | 1    | ダウン（地面に倒れている。横たわりは48x48内に収める） |

```js
frames: {
  idle: [ [ "....(48文字)....", /* ×48行 */ ], [ /* 2枚目 */ ] ],
  walk: [ [...], [...] ],
  light: [ [...], [...] ],
  heavy: [ [...], [...] ],
  special: [ [...], [...] ],
  hit:   [ [...] ],
  guard: [ [...] ],
  jump:  [ [...] ],
  ko:    [ [...] ]
}
```

### ドット絵アートディレクション（重要）

- **昭和〜平成初期のアーケード格闘ゲーム風**。チャンキーで読みやすいシルエット
- 全身に**暗色アウトライン**を入れること（背景に映える）
- 頭は大きめ（14〜18pxくらい）のデフォルメ頭身（2.5〜3頭身）
- ベタ塗り＋1段影。アンチエイリアス的な中間色グラデは控えめに
- attack/special の[1]フレームは**腕や武器が前方（右）に大きく伸びる**こと（攻撃のリーチが視覚的に分かるように）
- 透明部分が多すぎないこと（非透明ピクセル 300個以上が目安）

## stats（基本性能）

```js
stats: {
  hp: 100,        // 90〜110
  speed: 2.0,     // 歩行速度 px/frame。1.6〜2.6
  jumpPower: 7.5, // 6.5〜8.5
  weight: 1.0     // 0.8〜1.2（重いほどノックバックしにくい）
}
```

## moves（技データ）

```js
moves: {
  light: {
    damage: 5,      // 4〜6
    range: 30,      // 24〜34（攻撃判定の前方リーチpx）
    startup: 4,     // 3〜5（発生フレーム）
    active: 4,      // 3〜5（持続）
    recovery: 8,    // 6〜10（硬直）
    knockback: 2    // 1〜3
  },
  heavy: {
    damage: 11,     // 9〜13
    range: 38,      // 30〜44
    startup: 11,    // 8〜13
    active: 5,      // 4〜6
    recovery: 16,   // 14〜20
    knockback: 6,   // 5〜8
    launch: false   // trueなら相手を浮かせる
  },
  special: {
    name: "炎串乱舞",   // 技名（日本語、KO演出等で表示）
    type: "projectile", // "projectile" | "rush" | "area" のいずれか
    damage: 16,         // 14〜20
    meterCost: 100,     // 固定100
    startup: 14,        // 10〜18
    recovery: 20,       // 16〜26
    // --- type別の追加フィールド ---
    // projectile（飛び道具）の場合:
    speed: 4,           // 3〜5
    sprite: {
      palette: { "f": "#ff8800", "y": "#ffee44", "o": "#401010" },  // 省略時は本体paletteを使う
      frames: [ [ "....(16文字)....", /* ×16行 */ ], [ /* 2枚目 */ ] ]  // 16x16を2枚
    }
    // rush（突進技）の場合:
    // distance: 110,   // 80〜140
    // rushSpeed: 7     // 6〜8
    // area（周囲攻撃）の場合:
    // radius: 60       // 50〜70
  }
}
```

## sfxProfile

```js
sfxProfile: {
  attack: "punch",   // "punch" | "slash" | "metal" | "paw" など自由な文字列
  special: "fire"    // "fire" | "electric" | "magic" | "rocket" など自由な文字列
}
```

## 検証

作成後、必ず以下を実行して **PASS するまで修正** すること：

```
node tools/validate.js js/characters/<id>.js
```

シルエット確認用プレビュー（フレームをテキスト表示）：

```
node tools/preview.js js/characters/<id>.js idle 0
node tools/preview.js js/characters/<id>.js special 1
```
