import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from '@/components/sinong/shell';

export const metadata: Metadata = {
  title: "耕知·耘诊 · SRT27 | 农机诊断工作台",
  description: "从真实农机模型到有据可查的故障知识，耕知·耘诊为农机学习与排查提供清晰的工作台。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased"><AppShell>{children}</AppShell></body>
    </html>
  );
}
