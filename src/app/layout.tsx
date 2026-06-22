import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpecFlow OS",
  description: "흩어진 업무 정보를 화면 구조와 작업 목록으로 정리합니다.",
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
