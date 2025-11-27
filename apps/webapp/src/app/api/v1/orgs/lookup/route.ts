import { NextRequest, NextResponse } from "next/server";
import { OrganizationService } from "@/services/organization.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }
    
    // Use the organization service to lookup the organization
    const result = await OrganizationService.lookupByEmail(email);
    
    if (result.found) {
      return NextResponse.json({
        found: true,
        organization: result.organization,
        domain: result.domain
      });
    } else {
      return NextResponse.json({
        found: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error("Error looking up organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
