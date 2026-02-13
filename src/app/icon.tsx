import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Path from public/cup.svg (coffee cup icon)
const cupPath =
  "M768 192a192 192 0 1 1-8 383.808A256.13 256.13 0 0 1 512 768H320A256 256 0 0 1 64 512V160a32 32 0 0 1 32-32h640a32 32 0 0 1 32 32zm0 64v256a128 128 0 1 0 0-256M96 832h640a32 32 0 1 1 0 64H96a32 32 0 1 1 0-64m32-640v320a192 192 0 0 0 192 192h192a192 192 0 0 0 192-192V192z";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 1024 1024"
          fill="black"
        >
          <path d={cupPath} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
