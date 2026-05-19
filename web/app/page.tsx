import { Nav }                from "@/components/nav/Nav";
import { Hero }               from "@/components/landing/Hero";
import { Gallery }            from "@/components/landing/Gallery";
import { Pipeline }           from "@/components/landing/Pipeline";
import { Coverage }           from "@/components/landing/Coverage";
import { Taglines }           from "@/components/landing/Taglines";
import { Team }               from "@/components/landing/Team";
import { Architecture }       from "@/components/landing/Architecture";
import { DetectorMatrix }     from "@/components/landing/DetectorMatrix";
import { BusinessBenefits }   from "@/components/landing/BusinessBenefits";
import { BusinessValue }      from "@/components/landing/BusinessValue";
import { WhyInnovative }      from "@/components/landing/WhyInnovative";
import { AttackCatalogInline } from "@/components/landing/AttackCatalogInline";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <>
      <Nav variant="landing" />
      <main>
        <Hero />

        {/* WHY INNOVATIVE — first impression after the hero */}
        <section id="innovation" className="max-w-[1280px] mx-auto px-7 py-24">
          <SectionHead
            eyebrow="Why this is innovative"
            title="Defence at the layer the LLM can't see."
            subtitle="Most model-safety tooling lives inside the model. Trapdoor lives in front of it, with detectors that reason about codepoints, bytes, and channels — not just words."
          />
          <WhyInnovative />
        </section>

        {/* COVERAGE — moved up so the modality-vs-defence story lands early */}
        <section id="coverage" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Threat coverage"
            title="7 modalities. 10 detectors. One safe context."
            subtitle="Documents, images, video, audio, spreadsheets, text, and the links and encodings woven through all of them — each gets the same deterministic pipeline."
          />
          <Coverage />
        </section>

        {/* LIVE DEMO — moved above Architecture: see the thing first, then learn how it works */}
        <section id="demo" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Live demo"
            title="See it block a hidden attack in real time."
            subtitle="Drop a file, paste a prompt, or pick one of the bundled samples. Trapdoor walks you through every stage of the scan and shows exactly which detector fired and why."
          />

          <div className="text-center mb-10">
            <Link
              href="/scan"
              className="
                inline-flex items-center gap-3 rounded-xl px-8 py-4
                text-base font-semibold text-white
                bg-grad shadow-glow border border-white/15
                hover:-translate-y-0.5 hover:shadow-[0_20px_56px_rgba(0,164,239,0.45)]
                active:translate-y-0 transition-all duration-200 ease-out
              "
            >
              <PlayCircle className="h-5 w-5" strokeWidth={2.2} />
              Launch the scanner
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <div className="mt-3 text-[12px] font-mono text-muted-dim">
              No sign-up · runs against the live Azure backend · ~1200 ms per scan
            </div>
          </div>
        </section>

        {/* TECH STACK & ARCHITECTURE — the interactive walkthrough */}
        <section id="architecture" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Tech stack & architecture"
            title="5 stages. 10 detectors. One safe context."
            subtitle="Every uploaded file flows through the same deterministic pipeline. Each stage emits a timed result; click any card to see what it does, what it produces, and the exact attack it stops."
          />
          <Architecture />
        </section>

        {/* BUSINESS VALUE — six industry use cases (slide 10) */}
        <section id="business-value" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Business value"
            title="Where it pays off."
            subtitle="Six industries where an AI reads files supplied by someone other than the immediate user. Same pipeline, different threat shapes, same outcome."
          />
          <BusinessValue />
        </section>

        {/* DETECTOR ↔ ATTACK MATRIX */}
        <section id="matrix" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Detector ↔ attack connections"
            title="Which detector catches which attack."
            subtitle="Hover or click any row or column to highlight its connections."
          />
          <DetectorMatrix />
        </section>

        {/* PIPELINE — high-level 5-stage strip (kept for the spec mention) */}
        <section id="pipeline" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="How it works"
            title="Guarding the LLM's entrance."
            subtitle="Trapdoor sits between user-uploaded content and your model. Nothing gets through unscanned."
          />
          <Pipeline />
        </section>

        {/* ATTACK CATALOG */}
        <section id="attacks" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Attack catalog"
            title="17 ways the LLM gets owned."
            subtitle="Every category Trapdoor recognises, with a copy-paste-ready payload and the detectors that catch it. Filter by detector to see what fires on what."
          />
          <AttackCatalogInline />
        </section>

        {/* GALLERY — caught-in-the-wild examples */}
        <section id="gallery" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Caught in the wild"
            title="Before the model falls for it."
            subtitle="Real-world attack patterns Trapdoor recognises across modalities."
          />
          <Gallery />
        </section>

        {/* BUSINESS BENEFITS — speed / cost / audit headlines */}
        <section id="benefits" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Why teams ship it"
            title="Faster, cheaper, audit-ready."
            subtitle="Faster than the LLM itself, cheaper than another API call, and structurally able to catch attacks the model can't see at all."
          />
          <BusinessBenefits />
        </section>

        <Taglines />

        <section id="team" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead eyebrow="Team" title="Built by" />
          <Team />
        </section>

        <footer className="max-w-[1280px] mx-auto px-7 py-10 flex flex-wrap items-center justify-between gap-3 border-t border-line text-xs text-muted font-mono">
          <div>Trapdoor · Multimodal prompt-injection defender</div>
          <div>Stack: Next.js · FastAPI · Azure App Service · Azure SWA · AI Foundry · Whisper</div>
        </footer>
      </main>
    </>
  );
}

function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-[760px] mx-auto mb-14">
      <span className="inline-block mb-3 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/25 text-[#c9beff] text-[11px] font-semibold tracking-[0.08em] uppercase">
        {eyebrow}
      </span>
      <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-3">{title}</h2>
      {subtitle ? <p className="text-muted text-base">{subtitle}</p> : null}
    </div>
  );
}
