#!/usr/bin/env node
// @ts-check
/**
 * check-docs.mjs — ドキュメント鮮度ガード (docs drift guard)
 *
 * GitHub Pages の使い方ドキュメント (website/src/content/docs) が、実装と
 * 食い違っていないか (= 嘘を書いていないか) を機械的に検証する。
 *
 * 「振る舞い」レベルの記述は人間レビューが要るが、コードから一意に抽出できる
 * 事実 — API エンドポイント / 既定ポート / 対応フォーマット / ロケール整合性 —
 * はここで自動照合し、ドリフトを CI で弾く。
 *
 * 実行: `node scripts/check-docs.mjs` (pnpm run check:docs)
 * 失敗時は exit code 1 + 差分内容を出力する。
 *
 * 追加のチェックを足したくなったら CHECKS 配列に push するだけ。
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "website/src/content/docs");
const LOCALES = ["", "en", "zh-tw"]; // "" = 既定 (ja)

/** @type {{name:string, run:()=>string[]}[]} */
const CHECKS = [];
/** 失敗メッセージを貯める。空なら成功。 */
const failures = [];
/** 情報メッセージ (失敗にはしない)。 */
const notes = [];

const read = (p) => readFileSync(p, "utf8");
const docPath = (locale, rel) => join(DOCS, locale, rel);

// ---- ソースからの事実抽出ヘルパ ------------------------------------------

/** 文字列中の /api/... パスを正規化して列挙する ({id} 等は {} に畳む、末尾 / は除去)。 */
function extractApiPaths(text) {
  const out = new Set();
  const re = /\/api\/[A-Za-z0-9_/{}-]+/g;
  let m;
  while ((m = re.exec(text))) {
    let p = m[0].replace(/\{[^}]+\}/g, "{}"); // パスパラメータ名を無視
    p = p.replace(/\/+$/, ""); // 末尾スラッシュ除去 (/api/remote/* → /api/remote)
    out.add(p);
  }
  return out;
}

// ---- Check A: ロケール間のファイル整合性 -----------------------------------

CHECKS.push({
  name: "ロケール整合性 (ja / en / zh-tw で同じガイドが揃っているか)",
  run() {
    const errs = [];
    const listGuides = (locale) => {
      const dir = docPath(locale, "guide");
      if (!existsSync(dir)) return null;
      return new Set(readdirSync(dir).filter((f) => /\.mdx?$/.test(f)));
    };
    const base = listGuides("");
    if (!base) return [`既定ロケールの guide/ が見つからない: ${docPath("", "guide")}`];
    for (const locale of LOCALES) {
      if (locale === "") continue;
      const set = listGuides(locale);
      if (!set) {
        errs.push(`ロケール "${locale}" の guide/ が存在しない`);
        continue;
      }
      for (const f of base) if (!set.has(f)) errs.push(`ロケール "${locale}" に guide/${f} が無い (ja には有る)`);
      for (const f of set) if (!base.has(f)) errs.push(`ロケール "${locale}" に余分な guide/${f} がある (ja に無い)`);
      if (!existsSync(docPath(locale, "index.mdx"))) errs.push(`ロケール "${locale}" に index.mdx が無い`);
    }
    return errs;
  },
});

// ---- Check B: API エンドポイントの実在性 -----------------------------------
// ドキュメントに書かれた /api/... が、実際の router に存在するか。
// 「存在しないエンドポイントを書く (= 嘘)」を弾く。逆 (実装にあるが未記載) は note 止まり。

CHECKS.push({
  name: "API エンドポイント実在性 (api-server.md の /api/... が router にあるか)",
  run() {
    const modPath = join(ROOT, "src-tauri/src/api/mod.rs");
    if (!existsSync(modPath)) return [`router ソースが見つからない: ${relative(ROOT, modPath)}`];
    // #[cfg(test)] 以降 (テスト内のダミー URL) は除外して router 部分だけ見る。
    const src = read(modPath);
    const routerSrc = src.split(/#\[cfg\(test\)\]/)[0];
    const codePaths = extractApiPaths(routerSrc);
    if (codePaths.size === 0) return [`router から /api/ パスを 1 つも抽出できなかった (抽出ロジックが古い?)`];

    const errs = [];
    for (const locale of LOCALES) {
      const p = docPath(locale, "guide/api-server.md");
      if (!existsSync(p)) continue; // ロケール不足は Check A が担当
      const docPaths = extractApiPaths(read(p));
      for (const ep of docPaths) {
        if (!codePaths.has(ep)) {
          errs.push(`[${locale || "ja"}] api-server.md が存在しないエンドポイント "${ep}" を記載 (router に無い)`);
        }
      }
    }
    // 参考: router にあるが ja ドキュメント未記載のもの (内部/リモコン系は意図的なので note のみ)
    const jaPaths = extractApiPaths(read(docPath("", "guide/api-server.md")));
    const undocumented = [...codePaths].filter((p) => !jaPaths.has(p) && p.startsWith("/api/"));
    if (undocumented.length) notes.push(`未記載の API パス (意図的なら無視可): ${undocumented.sort().join(", ")}`);
    return errs;
  },
});

// ---- Check C: 既定 API ポート ----------------------------------------------

CHECKS.push({
  name: "既定 API ポート (DEFAULT_PORT がドキュメントと一致するか)",
  run() {
    const apiCmd = join(ROOT, "src-tauri/src/commands/api.rs");
    if (!existsSync(apiCmd)) return [`api コマンドソースが見つからない: ${relative(ROOT, apiCmd)}`];
    const m = read(apiCmd).match(/DEFAULT_PORT\s*:\s*u16\s*=\s*(\d+)/);
    if (!m) return [`DEFAULT_PORT 定数を api.rs から抽出できなかった`];
    const port = m[1];
    const errs = [];
    for (const locale of LOCALES) {
      const p = docPath(locale, "guide/api-server.md");
      if (!existsSync(p)) continue;
      if (!read(p).includes(port)) errs.push(`[${locale || "ja"}] api-server.md に既定ポート ${port} の記載が無い`);
    }
    return errs;
  },
});

// ---- Check D: 変換 (convert) 対応フォーマット ------------------------------

CHECKS.push({
  name: "変換フォーマット (ConvertFormat と convert.md の一致)",
  run() {
    const t = join(ROOT, "src/types/convert.ts");
    if (!existsSync(t)) return [`convert.ts が見つからない: ${relative(ROOT, t)}`];
    const decl = read(t).match(/ConvertFormat\s*=\s*([^;]+);/);
    if (!decl) return [`ConvertFormat 型を抽出できなかった`];
    const fmts = [...decl[1].matchAll(/"([a-z0-9]+)"/g)].map((x) => x[1]);
    if (!fmts.length) return [`ConvertFormat からフォーマットを抽出できなかった`];
    const errs = [];
    for (const locale of LOCALES) {
      const p = docPath(locale, "guide/convert.md");
      if (!existsSync(p)) continue;
      const body = read(p).toLowerCase();
      for (const f of fmts) if (!body.includes(f)) errs.push(`[${locale || "ja"}] convert.md に対応フォーマット "${f.toUpperCase()}" の記載が無い`);
    }
    return errs;
  },
});

// ---- Check E: CD リッピング エンコード フォーマット -----------------------

CHECKS.push({
  name: "リッピング フォーマット (EncodeFormat と import.md の一致)",
  run() {
    const m = join(ROOT, "src-tauri/src/models.rs");
    if (!existsSync(m)) return [`models.rs が見つからない: ${relative(ROOT, m)}`];
    const decl = read(m).match(/enum\s+EncodeFormat\s*\{([^}]+)\}/);
    if (!decl) return [`EncodeFormat enum を抽出できなかった`];
    const variants = [...decl[1].matchAll(/\b([A-Z][a-z]+)\b/g)].map((x) => x[1].toLowerCase());
    if (!variants.length) return [`EncodeFormat の variant を抽出できなかった`];
    const errs = [];
    for (const locale of LOCALES) {
      const p = docPath(locale, "guide/import.md");
      if (!existsSync(p)) continue;
      const body = read(p).toLowerCase();
      for (const v of variants) if (!body.includes(v)) errs.push(`[${locale || "ja"}] import.md にリッピング対応フォーマット "${v.toUpperCase()}" の記載が無い`);
    }
    return errs;
  },
});

// ---- 実行 ------------------------------------------------------------------

console.log("📚 docs drift check (website/src/content/docs)\n");
for (const c of CHECKS) {
  let errs;
  try {
    errs = c.run();
  } catch (e) {
    errs = [`チェック実行中に例外: ${e instanceof Error ? e.message : String(e)}`];
  }
  if (errs.length === 0) {
    console.log(`  ✅ ${c.name}`);
  } else {
    console.log(`  ❌ ${c.name}`);
    for (const e of errs) console.log(`       - ${e}`);
    failures.push(...errs);
  }
}

if (notes.length) {
  console.log("\nℹ️  注記:");
  for (const n of notes) console.log(`   - ${n}`);
}

if (failures.length) {
  console.error(`\n❌ ドキュメントが実装とドリフトしています (${failures.length} 件)。`);
  console.error("   上記を website/src/content/docs/ で修正するか、実装変更に合わせてドキュメントを更新してください。");
  process.exit(1);
}
console.log("\n✅ ドキュメントは実装と整合しています。");
