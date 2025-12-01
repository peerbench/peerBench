import { NULL_UUID } from "@/lib/constants";
import { CollaboratorsTable } from "@/components/collaborators-table";
import { PromptSetService } from "@/services/promptset.service";
import { CollaboratorsTableRow } from "@/components/collaborators-table/row";

export interface CollaboratorsAndContributorsProps {
  promptSetId: number;
  userId?: string;
}

export async function CollaboratorsAndContributors({
  promptSetId,
  userId,
}: CollaboratorsAndContributorsProps) {
  const data = await PromptSetService.getCollaborators({
    promptSetId,
    requestedByUserId: userId ?? NULL_UUID,
    page: 1,

    // Count all the contributors whether they have a role in the Prompt Set or not
    excludePublicCollaborators: false,

    // TODO: Should we do pagination on this, or just fetch all of them?
    pageSize: 100,
  });

  return (
    <CollaboratorsTable>
      {data.data.map((item) => (
        <CollaboratorsTableRow
          key={item.userId}
          userId={item.userId}
          displayName={item.displayName}
          role={item.role}
          orgName={item.orgName}
          joinedAt={item.joinedAt ? item.joinedAt.toISOString() : null}
        />
      ))}
    </CollaboratorsTable>
  );
}
