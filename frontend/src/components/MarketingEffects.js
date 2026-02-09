import React from 'react';

export function WireMeshBg() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.04 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="wire" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 12h24M12 0v24" stroke="#d1e3f8" strokeWidth="0.5" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wire)" />
    </svg>
  );
}

export function GlowOrb({ className = "", color = "#34d399" }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        filter: "blur(60px)",
      }}
    />
  );
}
