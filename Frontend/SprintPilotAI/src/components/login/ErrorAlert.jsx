import React from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-lg"
      style={{ backgroundColor: "#FFF0EA", border: "1px solid #FFD9CB" }}
    >
      <AlertCircle
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        style={{ color: "#E8481F" }}
      />
      <div className="text-sm" style={{ color: "#E8481F" }}>
        <div className="font-semibold mb-1">Sign-in Error</div>
        <div className="text-xs">{error}</div>
      </div>
    </div>
  );
}
