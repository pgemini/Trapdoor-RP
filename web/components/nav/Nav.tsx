"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/util";
import { BackendStatus } from "./BackendStatus";

export interface NavProps {
  variant?: "landing" | "scan";
}

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const LANDING_LINKS: NavLink[] = [
  { label: "Problem",      href: "#problem" },
  { label: "Why",          href: "#innovation" },
  { label: "Architecture", href: "#architecture" },
  { label: "Use cases",    href: "#business-value" },
  { label: "Roadmap",      href: "#roadmap" },
  { label: "Demo",         href: "#demo" },
];

const SCAN_LINKS: NavLink[] = [
  { label: "Home",         href: "/",                  external: true },
  { label: "Why",          href: "/#innovation",       external: true },
  { label: "Architecture", href: "/#architecture",     external: true },
  { label: "Attacks",      href: "/#attacks",          external: true },
  { label: "Use cases",    href: "/#business-value",   external: true },
];

function TechMahindraLogo() {
  return (
    <svg
      width="124"
      height="34"
      viewBox="0 0 124 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Tech Mahindra"
      className="shrink-0"
    >
      <polygon points="6,2 48,2 42,32 0,32" fill="#E31837" />
      <text
        x="56" y="16"
        fill="#ffffff"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="13"
        fontWeight="800"
        letterSpacing="0.5"
      >
        TECH
      </text>
      <text
        x="56" y="30"
        fill="#E31837"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="13"
        fontWeight="500"
        letterSpacing="0.2"
      >
        mahindra
      </text>
    </svg>
  );
}

export function Nav({ variant = "landing" }: NavProps) {
  const links = variant === "landing" ? LANDING_LINKS : SCAN_LINKS;
  const subtitle =
    variant === "landing" ? "Multimodal injection defender" : "Scanner";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        "border-b border-line",
        "bg-bg/70 backdrop-blur-xl backdrop-saturate-150",
      )}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 rounded-md"
        >
          <TechMahindraLogo />
          <span className="h-7 w-px bg-white/15 shrink-0" aria-hidden="true" />
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Trapdoor
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted font-mono">
              {subtitle}
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) =>
            l.external ? (
              <Link
                key={l.label}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium",
                  "text-muted hover:text-white transition-colors",
                  "hover:bg-white/5",
                )}
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium",
                  "text-muted hover:text-white transition-colors",
                  "hover:bg-white/5",
                )}
              >
                {l.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <BackendStatus className="hidden sm:inline-flex" />
          <Link
            href="/scan"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2",
              "text-[13px] font-semibold text-white",
              "bg-grad shadow-glow border border-white/10",
              "hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(0,164,239,0.35)]",
              "active:translate-y-0 transition-all duration-200 ease-out",
            )}
          >
            Try Scanner
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Nav;
