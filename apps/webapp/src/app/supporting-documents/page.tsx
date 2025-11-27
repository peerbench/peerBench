"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Search,
  File,
  Loader2,
} from "lucide-react";
import { usePromptSetAPI } from "@/lib/hooks/use-prompt-set-api";
import { PromptSetAccessReasons } from "@/types/prompt-set";

interface SupportingDocument {
  id: number;
  name: string;
  content: string;
  cid: string;
  sha256: string;
  uploaderId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PromptSet {
  id: number;
  title: string;
  description: string;
  isPublic: boolean;
}

export default function SupportingDocumentsPage() {
  const { getPromptSets } = usePromptSetAPI();

  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [promptSets, setPromptSets] = useState<PromptSet[]>([]);
  const [documentPromptSets, setDocumentPromptSets] = useState<
    Record<number, PromptSet[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<SupportingDocument | null>(null);
  const [viewingDocument, setViewingDocument] =
    useState<SupportingDocument | null>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    content: "",
    isPublic: false,
    promptSetIds: [] as number[],
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    isPublic: false,
    promptSetIds: [] as number[],
  });

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/supporting-documents");
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      setDocuments(data.documents || []);

      // Load prompt sets for each document
      for (const document of data.documents || []) {
        await loadDocumentPromptSets(document.id);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDocumentPromptSets = async (documentId: number) => {
    try {
      const response = await fetch(
        `/api/supporting-documents/${documentId}/prompt-sets`
      );
      if (response.ok) {
        const data = await response.json();
        setDocumentPromptSets((prev) => ({
          ...prev,
          [documentId]: data.promptSets || [],
        }));
      }
    } catch (err) {
      console.error("Error loading document benchmarks:", err);
    }
  };

  const loadPromptSets = useCallback(async () => {
    try {
      const response = await getPromptSets({
        accessReason: PromptSetAccessReasons.edit,
        page: 1,
        pageSize: 100,
      });
      setPromptSets(response.data);
    } catch (err) {
      console.error("Error loading benchmarks:", err);
    }
  }, [getPromptSets]);

  // Load documents and prompt sets
  useEffect(() => {
    loadDocuments();
    loadPromptSets();
  }, [loadPromptSets, loadDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setUploadForm((prev) => ({
        ...prev,
        name: file.name,
        content,
      }));
    } catch {
      toast.error("Failed to read file");
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.name || !uploadForm.content) {
      toast.error("Name and content are required");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/supporting-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadForm),
      });

      if (!response.ok) throw new Error("Failed to upload document");

      toast.success("Document uploaded successfully");
      setShowUploadForm(false);
      setUploadForm({
        name: "",
        content: "",
        isPublic: false,
        promptSetIds: [],
      });
      loadDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditDocument = async (document: SupportingDocument) => {
    setEditingDocument(document);
    setEditForm({
      name: document.name,
      isPublic: document.isPublic,
      promptSetIds: [], // Will be loaded separately
    });

    // Load current prompt set associations
    try {
      const response = await fetch(
        `/api/supporting-documents/${document.id}/prompt-sets`
      );
      if (response.ok) {
        const data = await response.json();
        setEditForm((prev) => ({
          ...prev,
          promptSetIds: data.promptSets.map((ps: PromptSet) => ps.id),
        }));
      }
    } catch (err) {
      console.error("Error loading Benchmark associations:", err);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingDocument) return;

    try {
      const response = await fetch(
        `/api/supporting-documents/${editingDocument.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) throw new Error("Failed to update document");

      toast.success("Document updated successfully");
      setEditingDocument(null);
      loadDocuments();
    } catch (err) {
      console.error("Error updating document:", err);
      toast.error("Failed to update document");
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`/api/supporting-documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete document");

      toast.success("Document deleted successfully");
      loadDocuments();
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error("Failed to delete document");
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const viewFullDocument = (document: SupportingDocument) => {
    setViewingDocument(document);
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <File className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Supporting Documents</h1>
          </div>
          <p className="text-muted-foreground">
            Manage text documents that can be used with prompts
          </p>
        </div>
        <Button onClick={() => setShowUploadForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>
              Upload a text document that can be used with prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitUpload} className="space-y-4">
              <div>
                <label
                  htmlFor="file-upload"
                  className="text-sm font-medium text-foreground"
                >
                  Upload File
                </label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".txt,.md,.json"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  Document Name
                </label>
                <Input
                  id="name"
                  value={uploadForm.name}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter document name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="content"
                  className="text-sm font-medium text-foreground"
                >
                  Content
                </label>
                <Textarea
                  id="content"
                  value={uploadForm.content}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Enter document content"
                  rows={10}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={uploadForm.isPublic}
                  onCheckedChange={(checked) =>
                    setUploadForm((prev) => ({ ...prev, isPublic: !!checked }))
                  }
                />
                <label
                  htmlFor="isPublic"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Make document public
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Associate with Benchmarks (optional)
                </label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {promptSets.map((promptSet) => (
                    <div
                      key={promptSet.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`upload-ps-${promptSet.id}`}
                        checked={uploadForm.promptSetIds.includes(promptSet.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setUploadForm((prev) => ({
                              ...prev,
                              promptSetIds: [
                                ...prev.promptSetIds,
                                promptSet.id,
                              ],
                            }));
                          } else {
                            setUploadForm((prev) => ({
                              ...prev,
                              promptSetIds: prev.promptSetIds.filter(
                                (id) => id !== promptSet.id
                              ),
                            }));
                          }
                        }}
                      />
                      <label
                        htmlFor={`upload-ps-${promptSet.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {promptSet.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Form Modal */}
      {editingDocument && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Edit Document</CardTitle>
            <CardDescription>
              Update document settings and associations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-name"
                  className="text-sm font-medium text-foreground"
                >
                  Document Name
                </label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isPublic"
                  checked={editForm.isPublic}
                  onCheckedChange={(checked) =>
                    setEditForm((prev) => ({ ...prev, isPublic: !!checked }))
                  }
                />
                <label
                  htmlFor="edit-isPublic"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Make document public
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Associate with Benchmarks
                </label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {promptSets.map((promptSet) => (
                    <div
                      key={promptSet.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`edit-ps-${promptSet.id}`}
                        checked={editForm.promptSetIds.includes(promptSet.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditForm((prev) => ({
                              ...prev,
                              promptSetIds: [
                                ...prev.promptSetIds,
                                promptSet.id,
                              ],
                            }));
                          } else {
                            setEditForm((prev) => ({
                              ...prev,
                              promptSetIds: prev.promptSetIds.filter(
                                (id) => id !== promptSet.id
                              ),
                            }));
                          }
                        }}
                      />
                      <label
                        htmlFor={`edit-ps-${promptSet.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {promptSet.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Update Document</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDocument(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <div className="grid gap-4 max-w-4xl">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No documents match your search"
                  : "Upload your first document to get started"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowUploadForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((document) => (
            <Card key={document.id} className="max-w-full overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 break-words text-base">
                      <File className="w-4 h-4 flex-shrink-0" />
                      <span className="break-words">{document.name}</span>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Uploaded{" "}
                      {new Date(document.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge
                      variant={document.isPublic ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {document.isPublic ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Public
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Private
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Content Preview */}
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Content Preview
                    </label>
                    <div className="mt-1 p-2 bg-muted rounded-md max-h-24 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap break-words">
                        {document.content.substring(0, 150)}
                        {document.content.length > 150 && "..."}
                      </pre>
                    </div>
                  </div>

                  {/* Document ID */}
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Document ID
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {document.id}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(document.id.toString(), "Document ID")
                        }
                        className="h-7 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Associated Prompt Sets */}
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Associated Benchmarks
                    </label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {documentPromptSets[document.id] ? (
                        (documentPromptSets[document.id]?.length || 0) > 0 ? (
                          documentPromptSets[document.id]?.map((ps) => (
                            <Badge
                              key={ps.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {ps.title}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No Benchmarks associated
                          </span>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Loading...
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Hashes */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">
                        SHA256
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {document.sha256}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(document.sha256, "SHA256")
                          }
                          className="h-7 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">
                        CID
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {document.cid}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(document.cid, "CID")}
                          className="h-7 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewFullDocument(document)}
                      className="h-7 px-2 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditDocument(document)}
                      className="h-7 px-2 text-xs"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteDocument(document.id)}
                      className="h-7 px-2 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Full Document Modal */}
      {viewingDocument && (
        <Dialog
          open={!!viewingDocument}
          onOpenChange={() => setViewingDocument(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="break-words">
                {viewingDocument.name}
              </DialogTitle>
              <DialogDescription>
                Document ID: {viewingDocument.id} | Created:{" "}
                {new Date(viewingDocument.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Textarea
                value={viewingDocument.content}
                readOnly
                className="min-h-[400px] max-h-[60vh] resize-none font-mono text-sm"
                placeholder="Document content will appear here..."
              />
            </div>
            <div className="flex justify-between gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  copyToClipboard(viewingDocument.content, "Document content")
                }
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Text
              </Button>
              <Button onClick={() => setViewingDocument(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
