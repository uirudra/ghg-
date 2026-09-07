import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SelectionProvider } from "@/components/SelectionContext";
import { BackendWarmup } from "@/components/BackendWarmup";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "GHG Intelligence Nexus",
  description:
    "Conservation-constrained ML downscaling, methane event intelligence, and a grounded AI copilot for greenhouse gas data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-base font-body text-ink">
        <SelectionProvider>
          <div className="pointer-events-none fixed inset-0 bg-grid bg-[size:48px_48px] opacity-40" />
          <BackendWarmup>
            <div className="relative">
              <Nav />
              <main>{children}</main>
            </div>
          </BackendWarmup>
        </SelectionProvider>
      </body>
    </html>
  );
}
