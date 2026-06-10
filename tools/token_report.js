// セッショントランスクリプトからトークン使用量を集計
// usage: node tools/token_report.js <transcript.jsonl> [区切りテキスト]
const fs = require("fs");
const readline = require("readline");

const file = process.argv[2];
const marker = process.argv[3] || null; // このテキストを含む最初のassistantメッセージまでを「フェーズ1」とする

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  let markerHit = false;
  const mk = () => ({ in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 });
  const phase1 = mk(), phase2 = mk(), total = mk();

  for await (const line of rl) {
    let obj;
    try { obj = JSON.parse(line); } catch (e) { continue; }
    const msg = obj.message;
    if (!msg || obj.type !== "assistant" || !msg.usage) continue;

    // マーカー検知（フェーズ分割）
    if (marker && !markerHit && Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === "text" && c.text && c.text.includes(marker)) markerHit = true;
      }
    }
    const u = msg.usage;
    const tgt = marker ? (markerHit ? phase2 : phase1) : phase1;
    for (const t of [tgt, total]) {
      t.in += u.input_tokens || 0;
      t.out += u.output_tokens || 0;
      t.cacheRead += u.cache_read_input_tokens || 0;
      t.cacheWrite += u.cache_creation_input_tokens || 0;
      t.calls++;
    }
  }

  const fmt = (n) => (n >= 1000000 ? (n / 1000000).toFixed(2) + "M" : (n / 1000).toFixed(1) + "k");
  const show = (label, t) => {
    console.log(`${label}: APIコール${t.calls}回`);
    console.log(`  出力トークン:        ${fmt(t.out)}`);
    console.log(`  入力(非キャッシュ):  ${fmt(t.in)}`);
    console.log(`  キャッシュ書込:      ${fmt(t.cacheWrite)}`);
    console.log(`  キャッシュ読出:      ${fmt(t.cacheRead)}`);
  };
  if (marker) {
    show("【フェーズ1: マーカー到達まで】", phase1);
    show("【フェーズ2: それ以降】", phase2);
    console.log("マーカー検出: " + (markerHit ? "あり" : "なし（全部フェーズ1扱い）"));
  }
  show("【セッション合計（メインループのみ・サブエージェント除く）】", total);
}

main();
