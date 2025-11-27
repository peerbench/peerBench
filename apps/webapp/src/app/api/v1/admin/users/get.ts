import { NextResponse } from "next/server";
import { AdminService } from "@/services/admin.service";
import { OrganizationService } from "@/services/organization.service";
import { createHandler } from "@/lib/route-kit";
import { authAdmin } from "@/lib/route-kit/middlewares/auth-admin";
import { ApiError } from "@/errors/api-error";

/**
 * Get all users with comprehensive activity metrics for admin dashboard
 */
export const GET = createHandler()
  .use(authAdmin)
  .handle(async () => {
    try {
      const users = await AdminService.getUserActivityMetrics();

      // Enrich with organization data
      const enrichedUsers = await Promise.all(
        users.map(async (user) => {
          const orgLookup = user.email
            ? await OrganizationService.lookupByEmail(user.email)
            : { found: false };
          return {
            ...user,
            organizationName: orgLookup.found
              ? orgLookup.organization?.name || null
              : null,
          };
        })
      );

      return NextResponse.json({
        users: enrichedUsers,
        total: enrichedUsers.length,
      });
    } catch (error) {
      console.error("Error fetching user activity metrics:", error);
      throw ApiError.server("Failed to fetch user activity metrics");
    }
  });
