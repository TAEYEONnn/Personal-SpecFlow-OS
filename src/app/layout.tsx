import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpecFlow OS",
  description: "흩어진 업무 정보를 실행 가능한 디자인 명세로 컴파일합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
