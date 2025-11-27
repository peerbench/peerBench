import type { Organization } from "@/services/organization.service";
import { ensureHttpProtocol } from "@/utils/url";

interface OrgAffiliationCardProps {
  organization: Organization;
}

export function OrgAffiliationCard({ organization }: OrgAffiliationCardProps) {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <label className="block text-sm font-medium text-blue-800 mb-2">
        Organization Affiliation
      </label>
      <div className="space-y-2">
        <p className="text-sm font-medium text-blue-800">{organization.name}</p>
        {organization.country && (
          <p className="text-xs text-blue-600">
            {organization.country}
            {organization.alpha_two_code && ` (${organization.alpha_two_code})`}
          </p>
        )}
        {organization.web_page && (
          <p className="text-xs text-blue-600">
            <a
              href={ensureHttpProtocol(organization.web_page)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {organization.web_page}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

