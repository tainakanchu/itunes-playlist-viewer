// 漢字字体フォールド表 (han_table.txt) のジェネレータ。
//
// OpenCC の字単位辞書から「繁体字 / 日本語新字体 → 簡体字 (単一の代表字)」への
// 畳み込み表を生成する。canonical(c) は c を [新字体→繁] → [繁→簡] の順で
// 不動点まで反復して得た最終字。これにより繁/簡/日のどの字体も同じ代表字へ畳まれ、
// 字体を跨いだ検索・マッチが可能になる (過剰マッチ許容 = 再現率優先)。
//
// 入力 (このディレクトリに同梱, OpenCC Apache-2.0):
//   TSCharacters.txt          繁 → 簡
//   JPShinjitaiCharacters.txt 新字体 → 旧字体/繁
// 出力:
//   ../han_table.txt  各行 "<src>\t<dst>" (src 昇順)。先頭に `#` コメントヘッダ。
//
// 再生成: `node generate_han_table.mjs` (このディレクトリで実行)。
import { readFileSync, writeFileSync } from "node:fs";

const here = new URL("./", import.meta.url);
const read = (name) => readFileSync(new URL(name, here), "utf8");

function parseDict(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const key = line.slice(0, tab);
    const valsStr = line.slice(tab + 1).trim();
    if (!valsStr) continue;
    const firstVal = valsStr.split(/\s+/)[0];
    if (Array.from(key).length !== 1 || Array.from(firstVal).length !== 1) continue;
    if (!map.has(key)) map.set(key, firstVal);
  }
  return map;
}

const ts = parseDict(read("TSCharacters.txt")); // 繁 → 簡
const jp = parseDict(read("JPShinjitaiCharacters.txt")); // 新字体 → 旧字体/繁

function canonical(c) {
  // 新字体→繁→簡 を不動点まで反復 (多段の変体に対応 + 冪等性を保証)。
  let x = c;
  const seen = new Set();
  while (!seen.has(x)) {
    seen.add(x);
    let next = x;
    if (jp.has(next)) next = jp.get(next);
    if (ts.has(next)) next = ts.get(next);
    if (next === x) break;
    x = next;
  }
  return x;
}

const out = new Map();
for (const c of new Set([...ts.keys(), ...jp.keys()])) {
  const dst = canonical(c);
  if (dst !== c) out.set(c, dst);
}

// 冪等性検査: どの dst も src 側に現れない (= もう畳めない) こと。
let bad = 0;
for (const [, d] of out) if (out.has(d)) bad++;
if (bad !== 0) {
  console.error(`ERROR: ${bad} non-idempotent entries`);
  process.exit(1);
}

const keys = [...out.keys()].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
const header = [
  "# 漢字字体フォールド表 (繁体字 / 日本語新字体 → 簡体字代表字)。",
  "# 自動生成 (gen/generate_han_table.mjs)。手で編集しないこと。",
  "# 由来: OpenCC (Apache-2.0) TSCharacters.txt + JPShinjitaiCharacters.txt。",
  "# 各行: <src><TAB><dst>。`#` 始まりと空行は読み飛ばす。",
].join("\n");
const body = keys.map((k) => `${k}\t${out.get(k)}`).join("\n");
writeFileSync(new URL("../han_table.txt", here), header + "\n" + body + "\n");

console.log(`generated ../han_table.txt: ${out.size} entries`);
