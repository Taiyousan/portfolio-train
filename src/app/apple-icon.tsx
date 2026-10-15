import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The favicon (icon.svg) as a PNG, its background full bleed: iOS rounds
// the corners itself.
export default async function AppleIcon() {
  const svg = await readFile(path.join(process.cwd(), "src/app/icon.svg"));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#a63d2a",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        width={180}
        height={180}
        src={`data:image/svg+xml;base64,${svg.toString("base64")}`}
      />
    </div>,
    size,
  );
}
