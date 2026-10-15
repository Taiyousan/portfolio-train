import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The ticket palette (--ticket* in globals.css) and the scene's dusk.
const COLORS = {
  dusk: "#3a2a1f",
  card: "#f4efe4",
  ink: "#26211b",
  muted: "#6d6355",
  stamp: "#a63d2a",
};

// The link preview: the site's name printed on a train ticket.
export default async function Image() {
  const mono = await readFile(
    path.join(process.cwd(), "public/fonts/geist-mono-600.woff"),
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.dusk,
      }}
    >
      <div
        style={{
          width: 1040,
          height: 470,
          display: "flex",
          borderRadius: 24,
          background: COLORS.card,
          color: COLORS.ink,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Geist Mono",
              fontSize: 24,
              letterSpacing: 6,
              color: COLORS.muted,
            }}
          >
            PORTFOLIO · ALLER SIMPLE
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "Geist Mono",
                fontSize: 76,
                letterSpacing: 2,
              }}
            >
              {site.name.toUpperCase()}
            </div>
            <div style={{ marginTop: 20, fontSize: 30, color: COLORS.muted }}>
              {site.headline}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist Mono",
              fontSize: 24,
              letterSpacing: 4,
              color: COLORS.stamp,
            }}
          >
            {site.city.toUpperCase()}
          </div>
        </div>
        <div
          style={{
            width: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: `4px dashed ${COLORS.muted}`,
            background: COLORS.stamp,
            color: COLORS.card,
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
            fontFamily: "Geist Mono",
            fontSize: 26,
            letterSpacing: 4,
          }}
        >
          <div style={{ display: "flex" }}>DÉPART</div>
          <svg
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke={COLORS.card}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginTop: 16 }}
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Geist Mono", data: mono, weight: 600, style: "normal" }],
    },
  );
}
