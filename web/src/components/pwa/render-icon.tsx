import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function renderIcon(size: number, maskable = false) {
  // БҮТЭН лого (нэртэй) — эзэн 2026-10-18: «албан сайтад тасархай лого хэзээ ч байж болохгүй».
  // 1686×746 (2.26:1). Maskable: 80%-ийн аюулгүй тойрогт диагональ нь багтана (≈0.72).
  const logo = await readFile(path.join(process.cwd(), "public/logo-full.png"));
  const width = Math.round(size * (maskable ? 0.72 : 0.9));
  const height = Math.round(width * (746 / 1686));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
      }}
    >
      {/* Same local raster used by LogoMark; safe circle margin for maskable icons. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={`data:image/png;base64,${logo.toString("base64")}`}
        width={width}
        height={height}
      />
    </div>,
    { width: size, height: size },
  );
}
