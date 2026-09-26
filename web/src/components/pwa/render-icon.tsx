import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function renderIcon(size: number, maskable = false) {
  const logo = await readFile(path.join(process.cwd(), "public/logo-mark.png"));
  const edge = Math.round(size * (maskable ? 0.64 : 0.84));
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
        width={edge}
        height={edge}
      />
    </div>,
    { width: size, height: size },
  );
}
