import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VoidPix - 免费在线图片处理工具",
    template: "%s | VoidPix"
  },
  description: "VoidPix 是一款完全免费的在线图片处理工具，支持格式转换、图片压缩、添加水印、去除水印等功能。所有处理均在本地完成，保护您的隐私安全。",
  keywords: ["图片处理", "格式转换", "图片压缩", "水印", "在线工具", "免费", "隐私保护"],
  authors: [{ name: "VoidPix" }],
  creator: "VoidPix",
  publisher: "VoidPix",
  robots: "index, follow",
  icons: {
    icon: "/voidpix/icon.svg",
    shortcut: "/voidpix/icon.svg",
    apple: "/voidpix/icon.svg",
  },
  manifest: "/voidpix/manifest.json",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "VoidPix - 免费在线图片处理工具",
    description: "支持格式转换、图片压缩、添加水印、去除水印等功能，所有处理均在本地完成，保护您的隐私安全。",
    siteName: "VoidPix",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoidPix - 免费在线图片处理工具",
    description: "支持格式转换、图片压缩、添加水印、去除水印等功能，所有处理均在本地完成，保护您的隐私安全。",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansSC.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
