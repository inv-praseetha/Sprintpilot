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

      {/* Mock Card */}
      <div
        className="max-w-xs bg-white text-gray-900 rounded-2xl p-5 shadow-2xl relative z-10"
        style={{ boxShadow: "0 20px 50px -20px rgba(0,0,0,0.35)" }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs font-semibold" style={{ color: "#6B6E76" }}>
              Task Overview
            </div>
            <div
              className="text-2xl font-bold mt-1"
              style={{ color: "#14151A" }}
            >
              100 Completed
            </div>
          </div>
        </div>
        <div className="flex items-end gap-2 h-20 mb-3">
          {[55, 40, 95, 35, 20].map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md"
              style={{
                height: `${height}%`,
                backgroundColor: i === 2 ? "#FF5A36" : "#FFD9CB",
                backgroundImage:
                  i === 2
                    ? "repeating-linear-gradient(135deg, #FF5A36, #FF5A36 3px, #fff 3px, #fff 6px)"
                    : undefined,
              }}
            />
          ))}
        </div>
        <div
          className="flex justify-between text-xs"
          style={{ color: "#6B6E76" }}
        >
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
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
