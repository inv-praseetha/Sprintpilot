import React from "react";

export default function BrandHeader() {
  return (
    <div className="flex items-center gap-3 mb-8 sm:mb-12 lg:mb-14">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
        style={{ backgroundColor: "#FF5A36" }}
      >
        ✳
      </div>
      <div>
        <div
          className="font-bold text-sm leading-tight"
          style={{ color: "#14151A" }}
        >
          SprintPilotAI
        </div>
        <div className="text-xs" style={{ color: "#6B6E76" }}>
          sprintpilotaiinnovaturelabs.com
        </div>
      </div>
    </div>
  );
}
