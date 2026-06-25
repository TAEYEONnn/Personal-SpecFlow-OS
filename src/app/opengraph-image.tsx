import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SpecFlow OS — 회의록이 화면 설계서가 됩니다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#18181B",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* 배경 장식 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: "1px solid #2E2E33",
            borderRadius: "0px",
            display: "flex",
          }}
        />

        {/* 로고 영역 */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "48px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "#7F77DD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "700",
              color: "#EEEDFE",
            }}
          >
            S
          </div>
          <span
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#C8C8D2",
              letterSpacing: "-0.3px",
            }}
          >
            SpecFlow OS
          </span>
        </div>

        {/* 메인 타이틀 */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "700",
            color: "#F4F4F6",
            letterSpacing: "-1.5px",
            lineHeight: "1.1",
            marginBottom: "24px",
          }}
        >
          회의록이 화면 설계서가 됩니다.
        </div>

        {/* 설명 */}
        <div
          style={{
            fontSize: "22px",
            fontWeight: "400",
            color: "#909099",
            letterSpacing: "-0.3px",
            lineHeight: "1.5",
            maxWidth: "780px",
            marginBottom: "48px",
          }}
        >
          흩어진 업무 메모를 붙여넣으면 화면 흐름, 요구사항,
          할 일 목록까지 한번에 정리됩니다.
        </div>

        {/* 태그 */}
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { label: "AI 문서 생성", border: "#3C3489", color: "#AFA9EC" },
            { label: "팀 협업", border: "#085041", color: "#5DCAA5" },
            { label: "화면 흐름 시각화", border: "#3C3489", color: "#AFA9EC" },
            { label: "Notion 내보내기", border: "#713B2B", color: "#F0997B" },
          ].map((tag) => (
            <div
              key={tag.label}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                background: "#1E1E28",
                border: `1px solid ${tag.border}`,
                fontSize: "14px",
                fontWeight: "500",
                color: tag.color,
                display: "flex",
              }}
            >
              {tag.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
