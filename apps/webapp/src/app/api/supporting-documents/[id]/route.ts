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

    const document = await SupportingDocumentService.getDocument(documentId, {
      requestedByUserId: user.id,
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Error fetching supporting document:", error);
    return NextResponse.json(
      { error: "Failed to fetch supporting document" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();
    const { name, isPublic, promptSetIds } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const document = await SupportingDocumentService.updateDocument(
      documentId,
      {
        name,
        isPublic,
        promptSetIds,
      },
      {
        requestedByUserId: user.id,
      }
    );

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Error updating supporting document:", error);
    if (error instanceof Error && error.message.includes("permission")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update supporting document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await SupportingDocumentService.deleteDocument(documentId, {
      requestedByUserId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting supporting document:", error);
    if (error instanceof Error && error.message.includes("permission")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete supporting document" },
      { status: 500 }
    );
  }
}
