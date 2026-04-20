import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "GetRatingGame — Phân tích review game bằng AI",
  description:
    "Trích xuất, phân tích và phân nhóm review game từ Google Play & App Store bằng AI GPT-4o-mini. Tìm ra vấn đề hot nhất của bất kỳ game nào.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-background text-foreground">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
