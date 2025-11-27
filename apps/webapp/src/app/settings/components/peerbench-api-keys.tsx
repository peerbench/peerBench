"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Trash2, Plus, Key, AlertCircle } from "lucide-react";

interface ApiKey {
  id: number;
  key: string;
  provider: string;
  metadata: {
    name: string;
    createdAt: string;
  };
  createdAt: Date;
}

export function PeerBenchApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/v2/profile/keys/peerbench");
      if (!response.ok) throw new Error("Failed to fetch API keys");
      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Failed to load API keys");
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/v2/profile/keys/peerbench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!response.ok) throw new Error("Failed to create API key");

      const data = await response.json();
      setNewlyCreatedKey(data.key);
      setNewKeyName("");
      await fetchApiKeys();
      toast.success("API key created successfully!");
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this API key? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/v2/profile/keys/peerbench/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete API key");

      await fetchApiKeys();
      toast.success("API key deleted successfully");
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard!");
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  return (
    <Card className="w-full col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            PeerBench API Keys
          </span>
          <Button
            onClick={() => setShowNewKeyDialog(true)}
            size="sm"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Key
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Use PeerBench API keys to authenticate API requests instead of
              Supabase tokens. These keys can be used to create system prompts,
              upload data, and more.
            </p>
          </div>

          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {apiKey.metadata?.name || "Unnamed Key"}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                        {apiKey.key}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(apiKey.key)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteApiKey(apiKey.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create New Key Dialog */}
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Give your API key a descriptive name to help you remember what
                it&apos;s for.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Key Name
                </label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API, Development Key"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newKeyName.trim()) {
                      createApiKey();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewKeyDialog(false);
                    setNewKeyName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createApiKey}
                  disabled={isLoading || !newKeyName.trim()}
                >
                  {isLoading ? "Creating..." : "Create Key"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Show Newly Created Key Dialog */}
        <Dialog
          open={!!newlyCreatedKey}
          onOpenChange={() => setNewlyCreatedKey(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Created!</DialogTitle>
              <DialogDescription>
                Make sure to copy your API key now. You won&apos;t be able to
                see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This is the only time you&apos;ll be able to see this key.
                  Store it securely!
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newlyCreatedKey || ""}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(newlyCreatedKey!)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setNewlyCreatedKey(null)}>
                  I&apos;ve Saved My Key
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
