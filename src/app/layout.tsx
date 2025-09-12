import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LLMX - The llms.txt Generator",
  description: "Generate, validate, and maintain production-ready llms.txt files so large language models can reliably discover your site's canonical content.",
  keywords: ["llms.txt", "AI", "LLM", "sitemap", "SEO", "content discovery"],
  authors: [{ name: "LLMX Team" }],
  openGraph: {
    title: "LLMX - The llms.txt Generator",
    description: "Tell AI what to read. Generate, validate, and maintain production-ready llms.txt files.",
    type: "website",
    url: "https://llmx.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "LLMX - The llms.txt Generator",
    description: "Tell AI what to read. Generate, validate, and maintain production-ready llms.txt files.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
