import { Nav }       from "@/components/nav/Nav";
import { Hero }      from "@/components/landing/Hero";
import { CTATile }   from "@/components/landing/CTATile";
import { Gallery }   from "@/components/landing/Gallery";
import { Pipeline }  from "@/components/landing/Pipeline";
import { Coverage }  from "@/components/landing/Coverage";
import { Taglines }  from "@/components/landing/Taglines";
import { Team }      from "@/components/landing/Team";

export default function LandingPage() {
  return (
    <>
      <Nav variant="landing" />
      <main>
        <Hero />

        <section id="demo" className="max-w-[1280px] mx-auto px-7 py-24">
          <SectionHead
            eyebrow="Live Demo"
            title="Spot the hidden instruction."
            subtitle="Drop in a file, paste a prompt, or pick one of seven real attack samples. Trapdoor walks you through every step."
          />
          <CTATile />
        </section>

        <section id="gallery" className="max-w-[1280px] mx-auto px-7 py-24">
          <SectionHead
            eyebrow="Caught in the wild"
            title="Before the model falls for it."
            subtitle="Real-world attack patterns Trapdoor recognises across modalities."
          />
          <Gallery />
        </section>

        <section id="pipeline" className="max-w-[1280px] mx-auto px-7 py-24">
          <SectionHead
            eyebrow="How it works"
            title="Guarding the LLM's entrance."
            subtitle="Trapdoor sits between user-uploaded content and your model. Nothing gets through unscanned."
          />
          <Pipeline />
        </section>

        <section id="coverage" className="max-w-[1280px] mx-auto px-7 py-24">
          <SectionHead eyebrow="Threat coverage" title="One layer. Every modality." />
          <Coverage />
        </section>

        <Taglines />

        <section id="team" className="max-w-[1280px] mx-auto px-7 py-24">
          <SectionHead eyebrow="Team" title="Built by" />
          <Team />
        </section>

        <footer className="max-w-[1280px] mx-auto px-7 py-10 flex flex-wrap items-center justify-between gap-3 border-t border-line text-xs text-muted font-mono">
          <div>Trapdoor · Multimodal prompt-injection defender</div>
          <div>Stack: Next.js · FastAPI · AI Foundry</div>
        </footer>
      </main>
    </>
  );
}

function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-[720px] mx-auto mb-14">
      <span className="inline-block mb-3 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/25 text-[#c9beff] text-[11px] font-semibold tracking-[0.08em] uppercase">
        {eyebrow}
      </span>
      <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-3">{title}</h2>
      {subtitle ? <p className="text-muted text-base">{subtitle}</p> : null}
    </div>
  );
}
