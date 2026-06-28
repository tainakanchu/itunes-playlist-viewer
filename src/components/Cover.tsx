import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { artGradient, leadingGlyph } from "../lib/art";
import { useStore } from "../store/useStore";

const isTauri = "__TAURI_INTERNALS__" in window;

/// トラックの実ファイルに埋め込まれたジャケットの URL を返す（無ければ null）。
/// バックエンドの `artwork://` カスタムスキームが embedded picture を配信する。
export function artworkUrl(path: string | null | undefined): string | null {
  if (!path || !isTauri) return null;
  return convertFileSrc(path, "artwork");
}

/// 親（position:relative + overflow:hidden）を埋めるアートワーク <img>。
/// パスが無い / Tauri 外 / 埋め込み画像が無い(404) 場合は何も描画せず、
/// 下地のグラデーション＋グリフがそのまま見える。
export function ArtworkImg({ path }: { path: string | null | undefined }) {
  const [failed, setFailed] = useState(false);
  const epoch = useStore((s) => s.artworkEpoch);
  // path 変更時に加え、epoch 更新時にも失敗状態をリセットして再取得を許可する。
  useEffect(() => setFailed(false), [path, epoch]);

  const base = artworkUrl(path);
  const url = base ? `${base}${base.includes("?") ? "&" : "?"}v=${epoch}` : null;
  if (!url || failed) return null;
  return (
    <img
      className="cb-art-img"
      src={url}
      loading="lazy"
      decoding="async"
      draggable={false}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

interface CoverProps {
  /// グラデーションの種（通常はアルバム名）。
  seed: string | null | undefined;
  /// 中央に出す文字（通常は曲名先頭）。
  glyph: string | null | undefined;
  /// 実ファイルパス。あれば埋め込みジャケットを優先表示。
  path?: string | null;
  size: number;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}

/// 正方形のジャケット表示。埋め込み画像があればそれを、無ければ
/// アルバム名→2色グラデ + 曲名先頭グリフ（CJK 可）を表示する。
export function Cover({ seed, glyph, path, size, radius = 8, className, style }: CoverProps) {
  return (
    <div
      className={"cb-cover" + (className ? " " + className : "")}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: artGradient(seed),
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <span
        className="cb-cover-glyph"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontSize: Math.round(size * 0.46),
          fontWeight: 800,
          color: "rgba(255,255,255,.92)",
          fontFamily: '"Hiragino Sans","Noto Sans CJK SC",sans-serif',
          letterSpacing: "-.02em",
          textShadow: "0 2px 8px rgba(0,0,0,.35)",
          lineHeight: 1,
        }}
      >
        {leadingGlyph(glyph)}
      </span>
      <ArtworkImg path={path} />
    </div>
  );
}
