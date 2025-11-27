import { db } from "@/database/client";
import { eq, or, sql } from "drizzle-orm";
import { orgDomainsTable, orgsTable } from "@/database/schema";

export interface Organization {
  id: number;
  name: string;
  web_page?: string | null;
  alpha_two_code?: string | null;
  country?: string | null;
}

export interface OrganizationLookupResult {
  found: boolean;
  organization?: Organization;
  domain?: string;
  message?: string;
}

export class OrganizationService {
  /**
   * Look up an organization by email domain
   * @param email - The email address to look up
   * @returns Organization lookup result
   */
  static async lookupByEmail(email: string): Promise<OrganizationLookupResult> {
    try {
      // Extract domain from email
      const domain = email.split("@")[1];
      if (!domain) {
        return {
          found: false,
          message: "Invalid email format",
        };
      }

      // Query organization using Drizzle
      // Supports both exact match and subdomain match
      // e.g., "mit.edu" matches "mit.edu" AND "csail.mit.edu" matches "mit.edu"
      const orgDomain = await db
        .select({
          domain: orgDomainsTable.domain,
          org: {
            id: orgsTable.id,
            name: orgsTable.name,
            web_page: orgsTable.webPage,
            alpha_two_code: orgsTable.alphaTwoCode,
            country: orgsTable.country,
          },
        })
        .from(orgDomainsTable)
        .innerJoin(orgsTable, eq(orgDomainsTable.orgId, orgsTable.id))
        .where(
          or(
            eq(orgDomainsTable.domain, domain),
            sql`${domain} LIKE '%.' || ${orgDomainsTable.domain}`
          )
        )
        .limit(1);

      if (orgDomain.length === 0) {
        return {
          found: false,
          message: "No organization found for this email domain",
        };
      }

      return {
        found: true,
        organization: orgDomain[0]!.org,
        domain: orgDomain[0]!.domain,
      };
    } catch (error) {
      console.error("Error looking up organization:", error);
      throw new Error("Failed to lookup organization");
    }
  }

  /**
   * Get all organizations
   * @returns Array of all organizations
   */
  static async getAllOrganizations(): Promise<Organization[]> {
    try {
      const orgs = await db
        .select({
          id: orgsTable.id,
          name: orgsTable.name,
          web_page: orgsTable.webPage,
          alpha_two_code: orgsTable.alphaTwoCode,
          country: orgsTable.country,
        })
        .from(orgsTable)
        .orderBy(orgsTable.name);

      return orgs;
    } catch (error) {
      console.error("Error fetching organizations:", error);
      throw new Error("Failed to fetch organizations");
    }
  }

  /**
   * Get organization by ID
   * @param id - Organization ID
   * @returns Organization or null if not found
   */
  static async getOrganizationById(id: number): Promise<Organization | null> {
    try {
      const [org] = await db
        .select({
          id: orgsTable.id,
          name: orgsTable.name,
          web_page: orgsTable.webPage,
          alpha_two_code: orgsTable.alphaTwoCode,
          country: orgsTable.country,
        })
        .from(orgsTable)
        .where(eq(orgsTable.id, id))
        .limit(1);

      return org || null;
    } catch (error) {
      console.error("Error fetching organization by ID:", error);
      throw new Error("Failed to fetch organization");
    }
  }
}
