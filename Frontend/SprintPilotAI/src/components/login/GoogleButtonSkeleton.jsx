import React from "react";

export default function GoogleButtonSkeleton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[320px] max-w-full flex items-center justify-center gap-2.5 rounded-full py-3 px-4 text-sm font-semibold transition-colors"
      style={{
        border: "1px solid #ECEBE7",
        color: "#14151A",
        backgroundColor: "#fff",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.7 4.1-17 10.2z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.5-5.5C29.6 35.4 27 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.9 39.6 16.4 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.5 5.5C41.4 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
