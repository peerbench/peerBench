"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  File, 
  Eye, 
  EyeOff, 
  Copy, 
  Search,
  X
} from "lucide-react";
import { toast } from "react-toastify";

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

interface DocumentSelectorProps {
  selectedDocuments: SupportingDocument[];
  onDocumentsChange: (documents: SupportingDocument[]) => void;
  disabled?: boolean;
}

export default function DocumentSelector({ 
  selectedDocuments, 
  onDocumentsChange, 
  disabled = false 
}: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingDocument, setViewingDocument] = useState<SupportingDocument | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  const loadDocuments = async () => {
    try {
      const response = await fetch("/api/supporting-documents");
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      console.log("Loaded documents:", data.documents);
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDocumentToggle = (document: SupportingDocument) => {
    console.log("Toggling document:", document.name, document.id);
    const isSelected = selectedDocuments.some(doc => doc.id === document.id);
    
    if (isSelected) {
      console.log("Removing document from selection");
      onDocumentsChange(selectedDocuments.filter(doc => doc.id !== document.id));
    } else {
      console.log("Adding document to selection");
      onDocumentsChange([...selectedDocuments, document]);
    }
  };

  const handleRemoveDocument = (documentId: number) => {
    onDocumentsChange(selectedDocuments.filter(doc => doc.id !== documentId));
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

  const getShortenedName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + "...";
  };

  return (
    <div className="space-y-4">
      {/* Selected Documents */}
      {selectedDocuments.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Selected Documents ({selectedDocuments.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <File className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {getShortenedName(doc.name)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => viewFullDocument(doc)}
                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                >
                  <Eye className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Documents Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowSelector(true)}
        disabled={disabled}
        className="w-full"
      >
        <File className="w-4 h-4 mr-2" />
        {selectedDocuments.length > 0 ? "Add More Documents" : "Select Documents"}
      </Button>

      {/* Document Selection Modal */}
      <Dialog open={showSelector} onOpenChange={setShowSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Supporting Documents</DialogTitle>
            <DialogDescription>
              Choose documents to attach to your prompt. You can select multiple documents.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Documents List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="text-center py-8">Loading documents...</div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No documents match your search" : "No documents available"}
                </div>
              ) : (
                filteredDocuments.map((document) => {
                  const isSelected = selectedDocuments.some(doc => doc.id === document.id);
                  
                  return (
                    <Card 
                      key={document.id} 
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleDocumentToggle(document)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleDocumentToggle(document);
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <File className="w-4 h-4 text-gray-500" />
                              <h4 className="font-medium text-sm truncate">{document.name}</h4>
                              <Badge variant={document.isPublic ? "default" : "secondary"} className="text-xs">
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
                            <p className="text-xs text-muted-foreground mb-2">
                              {document.content.substring(0, 100)}
                              {document.content.length > 100 && "..."}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewFullDocument(document);
                                }}
                                className="h-6 px-2 text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(document.sha256, "SHA256");
                                }}
                                className="h-6 px-2 text-xs"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy SHA256
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setShowSelector(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSelector(false)}>
              Done ({selectedDocuments.length} selected)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Full Document Modal */}
      {viewingDocument && (
        <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="break-words">{viewingDocument.name}</DialogTitle>
              <DialogDescription>
                Document ID: {viewingDocument.id} | 
                Created: {new Date(viewingDocument.createdAt).toLocaleDateString()}
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
                onClick={() => copyToClipboard(viewingDocument.content, "Document content")}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Text
              </Button>
              <Button onClick={() => setViewingDocument(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
