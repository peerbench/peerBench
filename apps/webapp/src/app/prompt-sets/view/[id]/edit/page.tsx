import * as motion from "motion/react-client";
import { PromptSetService } from "@/services/promptset.service";
import { getUser } from "@/lib/actions/auth";
import { CoauthorsTable } from "@/components/coauthors-table";
import { InvitationLinksTable } from "@/components/invitation-links-table";
import { Button } from "@/components/ui/button";
import { LucideArrowLeft } from "lucide-react";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { NULL_UUID } from "@/lib/constants";
import Link from "next/link";
import InputForm from "./components/input-form";
import { NotFound } from "../_not-found";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const promptSetId = await params.then((p) => parseInt(p.id));
  const user = await getUser();
  const promptSet = await PromptSetService.getPromptSet({
    filters: {
      id: promptSetId,
    },
    requestedByUserId: user?.id ?? NULL_UUID, // Still apply access control rules
    requestReason: PromptSetAccessReasons.edit,
  });

  if (!promptSet) {
    return <NotFound />;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 mb-[200px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="flex flex-col items-start gap-4">
          <Button asChild variant="link">
            <Link href={`/prompt-sets/view/${promptSetId}`}>
              <LucideArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-700">Edit Benchmark</h1>
        </div>
        <div className="space-y-8">
          <InputForm promptSet={promptSet} />
          <CoauthorsTable
            allowEdit={true}
            promptSetId={promptSetId}
            isPromptSetPublic={promptSet.isPublic}
            hasUserEditPermission={promptSet.permissions?.canEdit}
            hasUserRemovePermission={promptSet.permissions?.canEdit}
          />
          <InvitationLinksTable
            promptSetId={promptSetId}
            isPromptSetPublic={promptSet.isPublic}
            hasUserEditPermission={promptSet.permissions?.canEdit}
          />
        </div>
      </motion.div>
    </main>
  );
}
