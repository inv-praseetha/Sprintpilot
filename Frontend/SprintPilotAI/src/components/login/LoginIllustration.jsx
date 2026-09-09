import React from "react";

export default function LoginIllustration() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between p-8 lg:p-10 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 15% 15%, rgba(255,255,255,0.14), transparent 40%), linear-gradient(160deg, #FF6B45 0%, #FF5A36 45%, #E8481F 100%)",
        color: "#fff",
      }}
    >
      {/* Decorative Blobs */}
      <div
        className="absolute rounded-full"
        style={{
          width: "260px",
          height: "260px",
          top: "-90px",
          right: "-90px",
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "180px",
          height: "180px",
          bottom: "-60px",
          left: "-60px",
          backgroundColor: "rgba(20,21,26,0.10)",
        }}
      />

      {/* Top Pill */}
      <div className="flex justify-end relative z-10">
        <div
          className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2"
          style={{
            backgroundColor: "rgba(255,255,255,0.16)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#2FE08C" }}
          />
          150 projects synced
        </div>
      </div>

      {/* Mock Card with Dashboard Sprint Schedule & Status Graph */}
      <div
        className="w-full max-w-sm bg-white/95 backdrop-blur text-gray-900 rounded-2xl p-5 shadow-2xl relative z-10"
        style={{ boxShadow: "0 20px 50px -20px rgba(0,0,0,0.35)" }}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="text-left">
            <div className="text-xs font-bold text-slate-800">
              Sprint Schedule & Status
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">
              Track timelines, status, and task load for project sprints
            </div>
          </div>
          
          {/* Miniature Legends */}
          <div className="flex flex-wrap gap-x-2 gap-y-1 justify-end max-w-[180px]">
            <span className="inline-flex items-center gap-1 text-[8px] font-black text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ea580c' }} />
              Cloud Sync
            </span>
            <span className="inline-flex items-center gap-1 text-[8px] font-black text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
              AI Analytics
            </span>
            <span className="inline-flex items-center gap-1 text-[8px] font-black text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#d946ef' }} />
              Dev Portal
            </span>
            <span className="inline-flex items-center gap-1 text-[8px] font-black text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
              Security
            </span>
          </div>
        </div>

        {/* SVG Graph */}
        <div className="relative w-full h-28 mb-3 overflow-visible">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 320 110" preserveAspectRatio="none">
            {/* Grid lines */}
            {[20, 55, 90].map((y, idx) => (
              <line
                key={idx}
                x1="10"
                y1={y}
                x2="310"
                y2={y}
                className="stroke-slate-100"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            ))}
            
            {/* Project 1 path (Cloud Sync Platform) */}
            <path
              d="M 10 52 L 85 40 L 160 60 L 235 28 L 310 68"
              fill="none"
              stroke="#ea580c"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Project 2 path (AI Analytics Hub) */}
            <path
              d="M 10 68 L 85 60 L 160 48 L 235 44 L 310 52"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Project 3 path (Developer Portal) */}
            <path
              d="M 10 20 L 85 36 L 160 72"
              fill="none"
              stroke="#d946ef"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Project 4 path (Security Gateway) */}
            <path
              d="M 10 76 L 85 64 L 160 56 L 235 68 L 310 84"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Dots for Project 1 */}
            {[[10, 52], [85, 40], [160, 60], [235, 28], [310, 68]].map(([x, y], i) => (
              <g key={`p1-${i}`}>
                <circle cx={x} cy={y} r="5" fill="#ea580c" fillOpacity="0.15" />
                <circle cx={x} cy={y} r="2.5" fill="#ea580c" />
                <circle cx={x} cy={y} r="0.8" fill="#ffffff" />
              </g>
            ))}
            
            {/* Dots for Project 2 */}
            {[[10, 68], [85, 60], [160, 48], [235, 44], [310, 52]].map(([x, y], i) => (
              <g key={`p2-${i}`}>
                <circle cx={x} cy={y} r="5" fill="#3b82f6" fillOpacity="0.15" />
                <circle cx={x} cy={y} r="2.5" fill="#3b82f6" />
                <circle cx={x} cy={y} r="0.8" fill="#ffffff" />
              </g>
            ))}

            {/* Dots for Project 3 */}
            {[[10, 20], [85, 36], [160, 72]].map(([x, y], i) => (
              <g key={`p3-${i}`}>
                <circle cx={x} cy={y} r="5" fill="#d946ef" fillOpacity="0.15" />
                <circle cx={x} cy={y} r="2.5" fill="#d946ef" />
                <circle cx={x} cy={y} r="0.8" fill="#ffffff" />
              </g>
            ))}

            {/* Dots for Project 4 */}
            {[[10, 76], [85, 64], [160, 56], [235, 68], [310, 84]].map(([x, y], i) => (
              <g key={`p4-${i}`}>
                <circle cx={x} cy={y} r="5" fill="#8b5cf6" fillOpacity="0.15" />
                <circle cx={x} cy={y} r="2.5" fill="#8b5cf6" />
                <circle cx={x} cy={y} r="0.8" fill="#ffffff" />
              </g>
            ))}
          </svg>
        </div>

        <div className="flex justify-between text-[10px] font-black text-slate-400 px-1">
          <span>Sprint 1</span>
          <span>Sprint 2</span>
          <span>Sprint 3</span>
          <span>Sprint 4</span>
          <span>Sprint 5</span>
        </div>
      </div>

      {/* Bottom Copy */}
      <div className="relative z-10">
        <h2 className="text-2xl font-bold leading-tight mb-2">
          Every project,
          <br />
          perfectly in sync.
        </h2>
        <p className="text-sm opacity-85 mb-4 max-w-xs leading-relaxed">
          Track tasks, timelines and teams in one calm workspace built for
          people who ship.
        </p>
        <div className="flex -space-x-2">
          <div
            className="w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold"
            style={{ borderColor: "#FF5A36", color: "#E8481F" }}
          >
            SH
          </div>
          <div
            className="w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold"
            style={{ borderColor: "#FF5A36", color: "#E8481F" }}
          >
            +8
          </div>
        </div>
      </div>
    </div>
  );
}
