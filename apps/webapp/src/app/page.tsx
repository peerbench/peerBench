import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

// Hardcoded prompt sets for fast loading
const featuredPromptSets = [
  {
    id: 0,
    title: "General Review",
    description:
      "Review general prompts and help improve AI benchmarking quality",
  },
  {
    id: 95,
    title: "Logical Puzzles - English",
    description:
      "Review puzzles and contribute to logical reasoning AI evaluation",
  },
  {
    id: 100,
    title: "AIME25 Mathematical Reasoning Benchmark - English",
    description: "Review AIME25 mathematical reasoning prompts",
  },
  {
    id: 94,
    title: "Enhanced History Questions",
    description:
      "Review history prompts: knowledge in combination with reasoning and math skills",
  },
  {
    id: 88,
    title: "Polish Language Mix of Tasks",
    description:
      "Review Polish language prompts: culture, language, history, geography, and more",
  },
  {
    id: 92,
    title: "Ukrainian Grammar",
    description:
      "Review Ukrainian grammar prompts: updated rules of Ukrainian grammar",
  },
];

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 mb-[200px]">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Join us to solve the problem of cheating on AI Benchmarking
        </h1>
      </div>

      {/* NeurIPS Announcement */}
      <div className="mb-4 flex justify-center">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg max-w-3xl">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🎉</span>
            <div className="flex-1">
              <p className="text-lg text-gray-800 mb-3">
                Our paper{" "}
                <span className="font-semibold">
                  &quot;Benchmarking is Broken - Don&apos;t Let AI be its Own
                  Judge&quot;
                </span>{" "}
                just got accepted to{" "}
                <span className="font-bold text-blue-600">NeurIPS 2025</span>{" "}
                <a
                  href="https://arxiv.org/abs/2510.07575"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <span>(Read on arXiv</span>
                  <ExternalLink className="w-4 h-4" />
                  <span>)</span>
                </a>
              </p>
              <p className="text-lg text-gray-600">
              <span>We will be publishing a series of subsequent papers on PeerBench and want to 
              reward those who make it possible. </span>
                <span className="font-bold">
                  Get your name in the paper by contributing to the community (create prompts, comment, review).
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PeerBench Info Box */}
      <div className="mb-4 flex justify-center">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg max-w-3xl">
          <p className="text-lg text-gray-600 text-center">
            <span className="font-bold">PeerBench.ai</span> is an open-source, non-profit community implementation
            of the NeurIPS paper, bringing the research to life.
          </p>
        </div>
      </div>

      {/* Start Reviewing Section */}
      <div className="mb-12">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {featuredPromptSets.map((promptSet) => (
                <div
                  key={promptSet.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      {promptSet.title}
                    </div>
                    <div className="text-sm text-gray-600">
                      {promptSet.description}
                    </div>
                  </div>
                  <Link
                    href={`/prompts/review?excludeReviewed=true&promptSetId=${promptSet.id}`}
                  >
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white ml-4"
                    >
                      Start Reviewing
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Benchmark Section */}
      <div className="mb-12">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <Link href="/prompt-sets/create">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700"
                >
                  Start collaborating on a new Benchmark
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
