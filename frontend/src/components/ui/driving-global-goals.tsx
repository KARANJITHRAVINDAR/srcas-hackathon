import React, { useState } from "react";

/* ─── SDG Data ──────────────────────────────────────────────────────── */

const sdgNames = [
  "No Poverty",
  "Zero Hunger",
  "Good Health and Well-being",
  "Quality Education",
  "Gender Equality",
  "Clean Water and Sanitation",
  "Affordable and Clean Energy",
  "Decent Work and Economic Growth",
  "Industry, Innovation and Infrastructure",
  "Reduced Inequalities",
  "Sustainable Cities and Communities",
  "Responsible Consumption and Production",
  "Climate Action",
  "Life Below Water",
  "Life on Land",
  "Peace, Justice and Strong Institutions",
  "Partnerships for the Goals",
];

const sdgColors = [
  "#E5243B", // 1
  "#DDA63A", // 2
  "#4C9F38", // 3
  "#C5192D", // 4
  "#FF3A21", // 5
  "#26BDE2", // 6
  "#FCC30B", // 7
  "#A21942", // 8
  "#FD6925", // 9
  "#DD1367", // 10
  "#FD9D24", // 11
  "#BF8B2E", // 12
  "#3F7E44", // 13
  "#0A97D9", // 14
  "#56C02B", // 15
  "#00689D", // 16
  "#19486A", // 17
];

interface SdgIcon {
  id: number;
  name: string;
  color: string;
  iconSrc: string;
}

const defaultIconsData: SdgIcon[] = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  name: sdgNames[i],
  color: sdgColors[i],
  iconSrc: `https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-${String(i + 1).padStart(2, "0")}.jpg`,
}));

/* ─── Component ─────────────────────────────────────────────────────── */

interface DrivingGlobalGoalsProps {
  title?: string;
  subtitle?: string;
  iconsData?: SdgIcon[];
}

export default function DrivingGlobalGoals({
  title = "Driving Global Goals",
  subtitle = "Aligned with UN Sustainable Development Goals",
  iconsData = defaultIconsData,
}: DrivingGlobalGoalsProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section
      style={{
        background: "#F8F9FB",
        padding: "40px 0 60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Title Overlay ─────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 30,
          textAlign: "center",
          marginBottom: 48,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(248, 249, 251, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: "16px 48px",
            borderRadius: 16,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              color: "#0B1F4B",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: "clamp(14px, 2vw, 17px)",
              fontWeight: 500,
              margin: "8px 0 0",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* ── Photo Chain Row ───────────────────────────────── */}
      <div
        className="sdg-chain-scroll"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
          padding: "20px 24px 60px",
          overflowX: "auto",
          overflowY: "visible",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          {iconsData.map((sdg, i) => {
            const isHovered = hoveredId === sdg.id;
            const rotation = i % 2 === 0 ? -6 : 6;
            const marginLeft = i === 0 ? 0 : -18;

            return (
              <div
                key={sdg.id}
                onMouseEnter={() => setHoveredId(sdg.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  position: "relative",
                  zIndex: isHovered ? 50 : i + 1,
                  marginLeft,
                  flexShrink: 0,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isHovered
                    ? "translateY(-10px) rotate(0deg) scale(1.15)"
                    : `rotate(${rotation}deg)`,
                  cursor: "pointer",
                }}
              >
                {/* Card */}
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 8,
                    border: "5px solid #fff",
                    boxShadow: isHovered
                      ? "0 12px 28px rgba(0,0,0,0.25)"
                      : "0 4px 12px rgba(0,0,0,0.15)",
                    overflow: "hidden",
                    background: sdg.color,
                    transition: "box-shadow 0.3s ease",
                  }}
                >
                  <img
                    src={sdg.iconSrc}
                    alt={`SDG ${sdg.id}: ${sdg.name}`}
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={(e) => {
                      // Fallback: render a colored square with the SDG number
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector(".sdg-fallback")) {
                        const fallback = document.createElement("div");
                        fallback.className = "sdg-fallback";
                        fallback.style.cssText = `
                          width:100%;height:100%;display:flex;align-items:center;
                          justify-content:center;flex-direction:column;gap:2px;
                          background:${sdg.color};color:#fff;font-weight:800;
                          font-size:28px;font-family:var(--font-heading);
                        `;
                        fallback.innerHTML = `<span>${sdg.id}</span><span style="font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;padding:0 4px;line-height:1.1">${sdg.name}</span>`;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>

                {/* Tooltip */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -36,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#0B1F4B",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    opacity: isHovered ? 1 : 0,
                    pointerEvents: "none",
                    transition: "opacity 0.2s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  {sdg.id}. {sdg.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
