import { UserRoleOnPromptSet } from "@/database/types";

export const roleOptions = [
  {
    value: UserRoleOnPromptSet.admin,
    label: "Admin",
    description:
      "Full access to manage the Benchmark. Can do everything what Collaborator and Reviewer can do.",
  },
  {
    value: UserRoleOnPromptSet.collaborator,
    label: "Collaborator",
    description: "Can contribute new Prompts, results and reviews.",
  },
  {
    value: UserRoleOnPromptSet.reviewer,
    label: "Reviewer",
    description: "Can only review the Prompts.",
  },
];
