import { Nav }                from "@/components/nav/Nav";
import { Hero }               from "@/components/landing/Hero";
import { CTATile }            from "@/components/landing/CTATile";
import { Gallery }            from "@/components/landing/Gallery";
import { Pipeline }           from "@/components/landing/Pipeline";
import { Coverage }           from "@/components/landing/Coverage";
import { Taglines }           from "@/components/landing/Taglines";
import { Team }               from "@/components/landing/Team";
import { Architecture }       from "@/components/landing/Architecture";
import { BusinessBenefits }   from "@/components/landing/BusinessBenefits";
import { AttackCatalogInline } from "@/components/landing/AttackCatalogInline";

export default function LandingPage() {
  return (
    <>
      <Nav variant="landing" />
      <main>
        <Hero />

        <section id="demo" className="max-w-[1280px] mx-auto px-7 py-24">
          <SectionHead
            eyebrow="Live demo"
            title="Spot the hidden instruction."
            subtitle="Drop in a file, paste a prompt, or pick one of the bundled attack samples. Trapdoor walks you through every step of the scan."
          />
          <CTATile />
        </section>

        <section id="architecture" className="max-w-[1280px] mx-auto px-7 py-24">
          <SectionHead
            eyebrow="Architecture"
            title="Five stages. Ten detectors. One safe context."
            subtitle="Every uploaded file flows through the same deterministic pipeline. Each stage emits a timed result so you can audit exactly where a finding was born — and which axis of the attack tripped it."
          />
          <Architecture />
        </section>

        <section id="pipeline" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="How it works"
            title="Guarding the LLM's entrance."
            subtitle="Trapdoor sits between user-uploaded content and your model. Nothing gets through unscanned."
          />
          <Pipeline />
        </section>

        <section id="coverage" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Threat coverage"
            title="One layer. Every modality."
            subtitle="Documents, images, video, audio, spreadsheets, text, and the links and encodings woven through all of them."
          />
          <Coverage />
        </section>

        <section id="attacks" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Attack catalog"
            title="17 ways the LLM gets owned."
            subtitle="Every category Trapdoor recognises, with a copy-paste-ready payload and the detectors that catch it. Filter by detector to see what fires on what."
          />
          <AttackCatalogInline />
        </section>

        <section id="gallery" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Caught in the wild"
            title="Before the model falls for it."
            subtitle="Real-world attack patterns Trapdoor recognises across modalities."
          />
          <Gallery />
        </section>

        <section id="benefits" className="max-w-[1280px] mx-auto px-7 py-24 border-t border-line">
          <SectionHead
            eyebrow="Business value"
            title="Defence in depth, audit-ready."
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
          <div>Stack: Next.js · FastAPI · Azure AI Foundry · Whisper</div>
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
