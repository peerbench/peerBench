import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { SupportingDocumentService } from "@/services/supporting-document.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = parseInt(id);
    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promptSets = await SupportingDocumentService.getDocumentPromptSets(
      documentId,
      {
        requestedByUserId: user.id,
      }
    );

    return NextResponse.json({ promptSets });
  } catch (error) {
    console.error("Error fetching document benchmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch document benchmarks" },
      { status: 500 }
    );
  }
}
