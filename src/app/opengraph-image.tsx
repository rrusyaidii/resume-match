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
          background: "#edf0f4",
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
              background: "#2d6a6a",
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
              color: "#1e2d3d",
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
            color: "#1e2d3d",
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          Paste the JD. Get a hire signal.
        </p>

        <p
          style={{
            fontSize: 22,
            color: "#5a6b7a",
            marginBottom: 48,
            lineHeight: 1.4,
          }}
        >
          Malaysia hiring rubric · Shortlist · HM Review · Reject
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: "10px solid #2d6a6a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "white",
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 700, color: "#2f6b4f" }}>
              78%
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#2f6b4f",
              }}
            >
              Shortlist
            </span>
            <span style={{ fontSize: 18, color: "#5a6b7a" }}>
              Resume screening for hiring teams
            </span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background: "#c17a2e",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
