import { Organization, OrganizationLookupResult } from "./organization.service";

/**
 * Client-side organization service that wraps API calls
 * This provides the same interface as the server-side service
 * but works in the browser
 */
export class OrganizationClientService {
  /**
   * Look up an organization by email domain
   * @param email - The email address to look up
   * @returns Organization lookup result
   */
  static async lookupByEmail(email: string): Promise<OrganizationLookupResult> {
    try {
      const response = await fetch(`/api/v1/orgs/lookup?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error looking up organization:", error);
      throw new Error("Failed to lookup organization");
    }
  }

  /**
   * Get all organizations (if you need this on the client side)
   * @returns Array of all organizations
   */
  static async getAllOrganizations(): Promise<Organization[]> {
    try {
      const response = await fetch('/api/v1/orgs');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.organizations || [];
    } catch (error) {
      console.error("Error fetching organizations:", error);
      throw new Error("Failed to fetch organizations");
    }
  }

  /**
   * Get organization by ID (if you need this on the client side)
   * @param id - Organization ID
   * @returns Organization or null if not found
   */
  static async getOrganizationById(id: number): Promise<Organization | null> {
    try {
      const response = await fetch(`/api/v1/orgs/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.organization || null;
    } catch (error) {
      console.error("Error fetching organization by ID:", error);
      throw new Error("Failed to fetch organization");
    }
  }
}
