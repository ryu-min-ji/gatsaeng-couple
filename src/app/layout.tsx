import type { Metadata } from "next";
import { Fraunces, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700"],
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-kr",
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "갓생커플",
  description: "취준생·대학생 커플을 위한 습관 챌린지",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${fraunces.variable} ${notoSansKr.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
