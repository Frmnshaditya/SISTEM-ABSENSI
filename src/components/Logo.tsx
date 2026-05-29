import React from "react";

interface LogoProps {
  className?: string;
  variant?: "full" | "icon";
}

export default function Logo({ className = "h-12 w-12", variant = "full" }: LogoProps) {
  if (variant === "icon") {
    // A simplified elegant icon-only version of the crest for compact spots
    return (
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Outer Shield Backing */}
        <path
          d="M 25,25 L 175,25 L 175,100 C 175,145 137,175 100,185 C 63,175 25,145 25,100 Z"
          fill="#0c1f4e"
        />
        {/* Inner Gold/Red Accents */}
        <path
          d="M 35,35 L 165,35 L 165,95 C 165,135 132,162 100,172 C 68,162 35,135 35,95 Z"
          fill="#7c120c"
          stroke="#0c1f4e"
          strokeWidth="3"
        />
        {/* Torch Symbol */}
        <path
          d="M 95,115 L 105,115 L 103,130 L 97,130 Z"
          fill="#ffffff"
        />
        <path
          d="M 88,105 H 112 L 107,115 H 93 Z"
          fill="#ffffff"
        />
        <path
          d="M 90,105 C 88,95 94,85 100,75 C 104,83 102,93 108,95 C 112,90 112,82 114,78 C 116,90 110,105 90,105"
          fill="#ffffff"
        />
        {/* Simple White Star */}
        <polygon
          points="100,140 102,145 108,145 103,149 105,155 100,151 95,155 97,149 92,145 98,145"
          fill="#ffffff"
        />
      </svg>
    );
  }

  // Fully-featured main corporate/school crest with EST 2026 and text banner
  return (
    <svg
      viewBox="0 0 500 350"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 1. TOP CAP BANNER (EST 2026) */}
      <path
        d="M 185,45 L 210,13 L 290,13 L 315,45 Z"
        fill="#0c1f4e"
        stroke="#0c1f4e"
        strokeWidth="1"
      />
      <text
        x="250"
        y="33"
        fill="#ffffff"
        fontWeight="800"
        fontSize="13"
        letterSpacing="2.5"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        EST 2026
      </text>

      {/* 2. INNER PANELS BACKGROUND (Divided red chambers) */}
      <rect
        x="128"
        y="50"
        width="118"
        height="100"
        fill="#7c120c"
      />
      <rect
        x="254"
        y="50"
        width="118"
        height="100"
        fill="#7c120c"
      />

      {/* 3. SYMBOLS (Pen Nib Left, Torch Right) */}
      {/* Left Symbol: Pen Nib */}
      <g transform="translate(42, -5)">
        {/* Upper cylindrical stem */}
        <path
          d="M 141,83 L 149,83 L 149,95 L 141,95 Z"
          fill="#ffffff"
        />
        {/* Main nib collar */}
        <path
          d="M 141,95 H 137 L 135,108 C 135,115 143,126 145,129 C 147,126 155,115 155,108 L 153,95 H 149"
          fill="#ffffff"
          fillRule="evenodd"
          clipRule="evenodd"
        />
        {/* Split slit line */}
        <line
          x1="145"
          y1="105"
          x2="145"
          y2="126"
          stroke="#7c120c"
          strokeWidth="1.5"
        />
        {/* Vent hole */}
        <circle
          cx="145"
          cy="104"
          r="1.8"
          fill="#7c120c"
        />
      </g>

      {/* Right Symbol: Torch */}
      <g transform="translate(1, -2)">
        {/* Handle */}
        <path
          d="M 309,103 L 315,103 L 314,115 L 310,115 Z"
          fill="#ffffff"
        />
        {/* Outer bowl */}
        <path
          d="M 303,94 H 321 L 317,103 H 307 Z"
          fill="#ffffff"
        />
        {/* Styled Organic Flame waves */}
        <path
          d="M 305,94 C 303,84 309,74 312,65 C 316,73 314,83 320,85 C 324,80 324,72 326,68 C 328,80 322,94 305,94"
          fill="#ffffff"
        />
      </g>

      {/* 4. MAIN NAVY SHIELD OUTLINE (Upper part wrapping the boxes) */}
      <path
        d="M 125,45 L 375,45 L 375,152 L 125,152 Z"
        stroke="#0c1f4e"
        strokeWidth="6"
        fill="none"
      />
      {/* Box separating dividing column */}
      <line
        x1="250"
        y1="45"
        x2="250"
        y2="152"
        stroke="#0c1f4e"
        strokeWidth="4"
      />

      {/* 5. BOTTOM SHIELD SECTION */}
      {/* Outer thick contours */}
      <path
        d="M 125,208 C 135,263 192,333 250,333 C 308,333 365,263 375,208"
        stroke="#0c1f4e"
        strokeWidth="6"
        fill="none"
      />
      {/* Inner fine accent curve */}
      <path
        d="M 137,208 C 145,254 196,312 250,312 C 304,312 355,254 363,208"
        stroke="#0c1f4e"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Dark red solid shield base segment */}
      <path
        d="M 148,208 C 158,245 198,295 250,295 C 302,295 342,245 352,208 Z"
        fill="#7c120c"
      />
      {/* Solid white central star */}
      <polygon
        points="250,233 254,244 265,244 256,251 259,262 250,255 241,262 244,251 235,244 246,244"
        fill="#ffffff"
      />

      {/* 6. EXPANDED HORIZONTAL BANNER (STRaddling the crest) */}
      {/* Banner background box */}
      <rect
        x="60"
        y="152"
        width="380"
        height="56"
        fill="#ffffff"
      />
      {/* Top Banner lining */}
      <line
        x1="58"
        y1="152"
        x2="442"
        y2="152"
        stroke="#0c1f4e"
        strokeWidth="6.5"
      />
      {/* Bottom Banner lining */}
      <line
        x1="58"
        y1="208"
        x2="442"
        y2="208"
        stroke="#0c1f4e"
        strokeWidth="6.5"
      />
      {/* Main Text branding */}
      <text
        x="250"
        y="192"
        fill="#7c120c"
        fontWeight="850"
        fontSize="30"
        letterSpacing="1"
        textAnchor="middle"
        fontFamily="'Inter', 'Impact', system-ui, sans-serif"
      >
        SMA IT CORDOVA 174
      </text>
    </svg>
  );
}
