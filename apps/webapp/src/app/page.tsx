import { Geist, Martian_Mono } from "next/font/google";
import Image from "next/image";
import type { Metadata } from "next";

const geist = Geist({ subsets: ["latin"] });
const martianMono = Martian_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "peerBench: cheat-proof AI benchmarking",
  description:
    "peerBench is a protocol for AI benchmarking on secret test sets, with rankings computed across many independent institutions and auditable by anyone.",
};

const linkClassName =
  "break-words text-[#0f766e] underline decoration-[#0f766e]/60 underline-offset-[3px] hover:text-[#0b5f59] hover:decoration-current";

const labelClassName = `${martianMono.className} text-[12px] uppercase tracking-[0.08em]`;

const sections: LandingSection[] = [
  {
    label: "Papers",
    items: [
      {
        title: "Benchmarking is Broken: Don’t Let AI Be Its Own Judge",
        italic: true,
        note: "NeurIPS 2025, Position Paper Track. The original peerBench paper.",
        links: [
          { label: "arXiv", href: "https://arxiv.org/abs/2510.07575" },
          {
            label: "OpenReview",
            href: "https://openreview.net/forum?id=vFae5rRman",
          },
        ],
      },
      {
        title: "Video benchmark paper",
        note: "Preprint coming soon.",
        links: [],
      },
    ],
  },
  {
    label: "Platforms",
    items: [
      {
        title: "PeerBench Video Benchmark",
        tag: "(new platform)",
        note: "An open, federated benchmark for image-to-video models, rated by people at independent institutions.",
        links: [{ href: "https://video-benchmark.peerbench.ai/" }],
      },
      {
        title: "Original peerBench platform",
        tag: "(2025)",
        note: "The first prototype, for LLM prompts, reviews and leaderboards. It stays online.",
        links: [{ href: "https://peerbench.ai/prompts/explore" }],
      },
    ],
  },
  {
    label: "Code",
    items: [
      {
        title: "peerbench/peerBench",
        note: "Source of the original platform.",
        links: [{ href: "https://github.com/peerbench/peerBench" }],
      },
    ],
  },
  {
    label: "Community",
    items: [
      {
        title: "Discord",
        note: "Questions and discussion with the team.",
        links: [{ href: "https://discord.gg/kMa6vqHXZH" }],
      },
    ],
  },
];

export default function Home() {
  return (
    <div
      className={`${geist.className} min-h-screen bg-white text-[#111418] antialiased`}
    >
      <div className="mx-auto max-w-[66ch] px-4 sm:px-6 pt-8 pb-10 sm:pt-10 sm:pb-12 text-[17px] leading-[1.65]">
        <header className="flex items-center gap-2.5">
          <Image
            src="/logo-black.svg"
            alt=""
            width={21}
            height={24}
            className="h-6 w-auto"
          />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">
            peerBench
          </span>
        </header>

        <section className="pt-10 sm:pt-14 pb-8">
          <h1 className="text-[2rem] sm:text-[2.5rem] leading-[1.12] font-semibold tracking-[-0.025em] text-balance">
            Cheat-proof AI benchmarking.
          </h1>
          <p className="mt-5 text-pretty">
            peerBench is a protocol for evaluating AI models on secret test
            sets. Rankings come from many independent institutions instead of a
            single curator, and anyone can audit them.
          </p>
        </section>

        <section
          className="border-t border-[#dfe2e7] py-8"
          aria-labelledby="how"
        >
          <h2 id="how" className={`${labelClassName} text-[#0f766e]`}>
            Why and how
          </h2>
          <p className="mt-3 text-pretty">
            Public benchmarks leak into training data, so scores can reflect
            memorization instead of capability, and whoever builds the test set
            can cherry-pick it. Private benchmarks only move all the trust to
            one curator.
          </p>
          <p className="mt-3 text-pretty">
            In peerBench, independent institutions each run a node with their
            own secret test data and human raters. Nodes commit hashes of their
            data as they create it, and later the network picks a sample of
            about 10% to reveal, so a node that leaks or games its data shows up
            as a statistical outlier. Records are public on the AT Protocol, so
            anyone can recompute the rankings.
          </p>
        </section>

        <section className="pb-10" aria-labelledby="links">
          <h2 id="links" className="sr-only">
            Papers, platforms and code
          </h2>

          <dl className="divide-y divide-[#dfe2e7] border-y border-[#dfe2e7]">
            {sections.map((section) => (
              <div
                key={section.label}
                className="grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
              >
                <dt
                  className={`${labelClassName} text-[#4b525c] sm:pt-[0.45em]`}
                >
                  {section.label}
                </dt>
                <dd>
                  <ul className="space-y-4">
                    {section.items.map((item) => (
                      <LandingItemView key={item.title} item={item} />
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="pt-4 text-[14px] text-[#3f454e]">
          <p>peerBench is an open-source, non-profit project by Forest AI.</p>
        </footer>
      </div>
    </div>
  );
}

function LandingItemView({ item }: { item: LandingItem }) {
  const labelledLinks = item.links.filter((link) => link.label);
  const plainLinks = item.links.filter((link) => !link.label);

  return (
    <li>
      <p className={`font-medium text-pretty ${item.italic ? "italic" : ""}`}>
        {item.title}
        {item.tag && (
          <span className="font-normal text-[#3f454e]"> {item.tag}</span>
        )}
      </p>
      <p className="mt-0.5 text-[16px] text-[#3f454e] text-pretty">
        {item.note}
      </p>

      {labelledLinks.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[16px]">
          {labelledLinks.map((link) => (
            <div key={link.href} className="contents">
              <dt className="text-[#4b525c]">{link.label}</dt>
              <dd>
                <a href={link.href} className={linkClassName}>
                  {link.href}
                </a>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {plainLinks.map((link) => (
        <p key={link.href} className="mt-1 text-[16px]">
          <a href={link.href} className={linkClassName}>
            {link.href}
          </a>
        </p>
      ))}
    </li>
  );
}

type LandingLink = {
  href: string;
  label?: string;
};

type LandingItem = {
  title: string;
  note: string;
  links: LandingLink[];
  tag?: string;
  italic?: boolean;
};

type LandingSection = {
  label: string;
  items: LandingItem[];
};
