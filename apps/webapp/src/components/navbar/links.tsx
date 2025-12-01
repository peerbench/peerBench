import { User } from "@supabase/supabase-js";
import {
  LucideBookOpen,
  LucideSearch,
  LucideUpload,
  LucideFileCog,
  LucideWrench,
  LucideFileText,
  LucideGitCompare,
  LucideMessageSquareText,
  LucideExternalLink,
  LucideTrophy,
  LucideUsers,
  LucideBot,
  LucideUserCheck,
} from "lucide-react";
import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons";

export const links = [
  {
    label: "Leaderboards",
    icon: <LucideTrophy size={16} />,
    menu: [
      {
        label: "Models",
        href: "/leaderboards/models",
        description: "Top performing AI models",
        icon: <LucideBot />,
      },
      {
        label: "Reviewers",
        href: "/leaderboards/reviewers",
        description: "Most trusted reviewers",
        icon: <LucideUserCheck />,
      },
      {
        label: "Contributors",
        href: "/leaderboards/contributors",
        description: "Top data contributors",
        icon: <LucideUsers />,
      },
    ],
  },
  {
    label: "Benchmarks",
    icon: <LucideFileCog size={16} />,
    menu: [
      {
        label: "Create Benchmark",
        href: "/benchmarks/create",
        description: "Create new benchmarks",
        access: "authenticated",
        icon: <LucideFileCog />,
      },
      {
        label: "View Benchmarks",
        href: "/benchmarks/explore",
        description: "Explore benchmarks",
        icon: <LucideSearch />,
      },
      {
        label: "Run Benchmark",
        href: "/benchmarks/run",
        description: "Test benchmarks against models",
        icon: <LucideWrench />,
        access: "authenticated",
      },
    ],
  },
  {
    label: "Prompts",
    icon: <LucideMessageSquareText size={16} />,
    menu: [
      {
        label: "Create",
        href: "/prompts/create",
        description: "Create new Prompts",
        icon: <LucideMessageSquareText />,
        access: "authenticated",
      },
      {
        label: "Mass Upload",
        href: "/upload",
        description: "Upload multiple Prompts",
        icon: <LucideUpload />,
        access: "authenticated",
      },
      {
        label: "View",
        href: "/prompts/explore",
        description: "Explore Prompts",
        icon: <LucideSearch />,
      },
    ],
  },
  {
    label: "Compare",
    href: "/compare",
    icon: <LucideGitCompare />,
    access: "authenticated",
  },
  {
    label: "Review",
    href: "/prompts/review",
    icon: <LucideBookOpen />,
    access: "authenticated",
  },
  {
    label: "Onboarding Tutorial",
    href: "https://docs.google.com/document/d/1Wj7o3pAjqMSYy9pHeRXzvm24H3ByYgz7HRxjV67nnQM/edit?usp=sharing",
    icon: (
      <div className="flex items-center gap-1">
        <LucideFileText size={16} />
      </div>
    ),
    iconSuffix: <LucideExternalLink size={14} className="opacity-60" />,
    external: true,
  },
  {
    label: "",
    href: "https://discord.gg/kMa6vqHXZH",
    icon: <SiDiscord size={16} />,
    external: true,
    iconOnly: true,
  },
  {
    label: "",
    href: "https://github.com/peerbench/peerBench",
    icon: <SiGithub size={16} />,
    external: true,
    iconOnly: true,
  },
];

export const isNeedAuth = (link: any, user: User | null) => {
  if (link.access === "authenticated") {
    return user !== null;
  }
  return true;
};

export const isNeedExtra = (link: any, isExtraEnabled?: boolean) => {
  if (link.extra) {
    return isExtraEnabled;
  }
  return true;
};
