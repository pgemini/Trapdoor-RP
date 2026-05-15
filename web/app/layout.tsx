import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono  = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Trapdoor — Multimodal Prompt-Injection Defender",
  description:
    "Detects hidden prompt injection inside documents, images, audio, video, and spreadsheets before content reaches your LLM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans bg-bg text-[#e8ebf5]">
        <div aria-hidden className="fixed inset-0 -z-20 bg-grid pointer-events-none" />
        <div aria-hidden className="fixed inset-0 -z-10 bg-radial pointer-events-none" />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
