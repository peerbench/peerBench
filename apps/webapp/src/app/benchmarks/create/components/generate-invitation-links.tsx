"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InvitationLinksTable } from "@/components/invitation-links-table";
import Link from "next/link";
import { NewCreatedPromptSet } from "@/lib/hooks/use-prompt-set-api";
import { CheckCircle } from "lucide-react";

export function GenerateInvitationLinks({
  promptSet,
  isPublic,
}: {
  promptSet: NewCreatedPromptSet;
  isPublic: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Links</CardTitle>
          <CardDescription>
            Generate one-time invitation links below and send them to your Peers
            using your favorite communication channel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            {isPublic
              ? "Your benchmark has public submissions enabled. Every registered peerBench user can contribute data, results and reviews. That's why there is no need to invite Contributors or Reviewers. However you might still want to invite other Admins if there is any."
              : "Now it's time to invite your co-authors. Depending on what role you want them to have, generate a corresponding one-time use invite link below and send it to your peer using your favorite communication channel."}
          </p>
        </CardContent>
      </Card>

      {/* Invitation Links Table */}
      <InvitationLinksTable
        promptSetId={promptSet.id}
        isPromptSetPublic={isPublic}
        hasUserEditPermission={true}
      />

      {/* Footer Message */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-700 text-sm">
          You can always invite more contributors, remove them or change role
          assignments later
        </p>
      </div>

      {/* Finish Button */}
      <div className="flex justify-end">
        <Button asChild size="lg">
          <Link href={`/upload?promptSetId=${promptSet.id}`}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Finish
          </Link>
        </Button>
      </div>
    </div>
  );
}
