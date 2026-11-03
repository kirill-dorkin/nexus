import { ImageResponse } from "next/og";
import { brand } from "@platform/brand";

export const alt = `${brand.name} — понятное обучение цифровым навыкам`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        color: "#fff8fc",
        background: "#160d1c",
        padding: "76px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: 560,
          right: -140,
          top: -220,
          background: "#b82c78",
          opacity: 0.55,
          filter: "blur(70px)"
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 440,
          height: 440,
          borderRadius: 440,
          right: 90,
          bottom: -300,
          background: "#7346d7",
          opacity: 0.6,
          filter: "blur(65px)"
        }}
      />
      <div
        style={{
          display: "flex",
          position: "relative",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
          {brand.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              lineHeight: 1.04,
              fontWeight: 700,
              letterSpacing: "-3px",
              maxWidth: 880
            }}
          >
            Понимать IT.
            <br />
            Применять знания.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 28,
              color: "#d6cbd9"
            }}
          >
            Видео · конспекты · практика
          </div>
        </div>
      </div>
    </div>,
    size
  );
}
