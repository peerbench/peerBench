import { PromptService } from "@/services/prompt.service";
import { LucideArrowLeft } from "lucide-react";
import { getUser } from "@/lib/actions/auth";
import { NULL_UUID } from "@/lib/constants";
import * as motion from "motion/react-client";
import Link from "next/link";
import { AssignButton } from "./components/assign-button";
import PromptInfo from "./components/sections/prompt-info";
import PromptResponses from "@/components/prompt-responses";
import { NotFound } from "./_not-found";

interface PromptDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    fromPromptSet?: string;
  }>;
}

export default async function PromptDetailPage({
  params,
  searchParams,
}: PromptDetailPageProps) {
  const user = await getUser();
  const promptId = await params.then((p) => p.id);
  const fromPromptSetId = await searchParams.then((sp) => sp.fromPromptSet);

  // Fetch the specific prompt by ID
  const {
    data: [prompt],
  } = await PromptService.getPrompts({
    filters: {
      id: [promptId],
    },
    requestedByUserId: user?.id ?? NULL_UUID,
    page: 1,
    pageSize: 1,
  });

  if (!prompt) {
    return <NotFound />;
  }

  // TODO: Replace with an independent tags column rather than storing them within metadata.
  // Extract tags from metadata
  const tags = [
    ...(prompt.metadata?.tags || []),
    ...(prompt.metadata?.generatorTags || []),
    ...(prompt.metadata?.articleTags || []),
    ...(prompt.metadata?.sourceTags || []),
  ];

  // TODO: This should be done on the database query level
  prompt.responseAndScoreStats = [...prompt.responseAndScoreStats].sort(
    (a, b) => {
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return -1;
      return (b.avgScore ?? 0) - (a.avgScore ?? 0);
    }
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          {fromPromptSetId ? (
            <Link
              href={`/prompt-sets/view/${fromPromptSetId}`}
              className="flex items-center gap-2 group"
            >
              <LucideArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Benchmark
            </Link>
          ) : (
            <Link href="/prompts" className="flex items-center gap-2 group">
              <LucideArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Prompts
            </Link>
          )}
          <AssignButton promptId={prompt.id} />
        </div>
        <PromptInfo prompt={prompt} tags={tags} userId={user?.id} />
        <PromptResponses
          promptId={prompt.id}
          promptAnswer={prompt.answer}
          promptAnswerKey={prompt.answerKey}
          promptType={prompt.type}
        />
      </motion.div>
    </main>
  );
}
