import { ImageResponse } from "next/og";

export const alt = "ResuMatch — AI Resume Screener";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 80px",
          background: "#f6f4ef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#2a6b6b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            R
          </div>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#1a2332",
              letterSpacing: "-0.02em",
            }}
          >
            ResuMatch
          </span>
        </div>

        <p
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: "#1a2332",
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          Match score in seconds
        </p>

        <p
          style={{
            fontSize: 22,
            color: "#5c6678",
            marginBottom: 48,
            lineHeight: 1.4,
          }}
        >
          Upload resume · Paste job description · Get strengths, gaps & verdict
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: "10px solid #2a6b6b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "white",
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 700, color: "#2d6a4e" }}>
              78%
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#2d6a4e",
              }}
            >
              Shortlist
            </span>
            <span style={{ fontSize: 18, color: "#5c6678" }}>
              AI-powered resume screening
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
