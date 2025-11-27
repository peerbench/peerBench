import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { SupportingDocumentService } from "@/services/supporting-document.service";
// TODO: Refactor to use createHandler() and new pattern for API routes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");

    // TODO: Rename the query param to "pageSize"
    const pageSize = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;
    const uploaderId = searchParams.get("uploaderId") || undefined;
    const promptSetId = searchParams.get("promptSetId")
      ? parseInt(searchParams.get("promptSetId")!)
      : undefined;
    const isPublic = searchParams.get("isPublic")
      ? searchParams.get("isPublic") === "true"
      : undefined;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await SupportingDocumentService.getDocuments({
      requestedByUserId: user.id,
      pageSize,
      page: (page - 1) * pageSize,
      filters: {
        search,
        uploaderId,
        promptSetId,
        isPublic,
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching supporting documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch supporting documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content, isPublic, promptSetIds } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const document = await SupportingDocumentService.insertDocument({
      name,
      content,
      uploaderId: user.id,
      isPublic: isPublic || false,
      promptSetIds: promptSetIds || [],
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Error creating supporting document:", error);
    return NextResponse.json(
      { error: "Failed to create supporting document" },
      { status: 500 }
    );
  }
}
