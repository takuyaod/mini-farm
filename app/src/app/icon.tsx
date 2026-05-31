import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#16a34a",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* stem */}
          <line x1="12" y1="22" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          {/* left leaf */}
          <path
            d="M12 16 C8 14 5 10 7 6 C9 4 12 8 12 12"
            fill="white"
            opacity="0.9"
          />
          {/* right leaf */}
          <path
            d="M12 14 C16 12 19 8 17 4 C15 2 12 6 12 10"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
