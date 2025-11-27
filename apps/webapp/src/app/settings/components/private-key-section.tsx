"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import {
  Download,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  Bug,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { validateUserLocalKey } from "@/validation/user-local-key";
import { userLocalKeyStorage } from "@/utils/user-local-key-storage";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import {
  storeUserKey,
  signUserUuidWithPrivateKey,
  getUserKeys,
  deleteUserKeyById,
} from "@/services/key.service";
import { usePageContext } from "../context";

interface StoredKey {
  id: number;
  publicKey: string;
  keyType: string;
  userUuid: string;
  keySigningUuid: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
    source?: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function PrivateKeySection() {
  const searchParams = useSearchParams();
  const isDebugMode = searchParams.get("debug") === "1";
  const [userLocalKey, setUserLocalKey] = useState("");
  const [showUserLocalKey, setShowUserLocalKey] = useState(false);
  const [userLocalKeyError, setUserLocalKeyError] = useState<string | null>(
    null
  );
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  // Get shared state from context
  const { currentUser } = usePageContext();

  useEffect(() => {
    // Load saved user local key from localStorage only in debug mode
    if (isDebugMode) {
      const savedUserLocalKey = userLocalKeyStorage.get();
      if (savedUserLocalKey) {
        setUserLocalKey(savedUserLocalKey);
        validateAndSetPublicKey(savedUserLocalKey);
      }
    }
  }, [isDebugMode]);

  const loadStoredKeys = useCallback(async () => {
    if (!currentUser?.id) return;

    setIsLoadingKeys(true);
    try {
      const result = await getUserKeys(currentUser.id);
      if (result.success) {
        setStoredKeys(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load stored keys:", error);
    } finally {
      setIsLoadingKeys(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isDebugMode && currentUser?.id) {
      loadStoredKeys();
    }
  }, [isDebugMode, currentUser?.id, loadStoredKeys]);

  const generateNewPrivateKey = async () => {
    if (!currentUser?.id) {
      toast.error("User not authenticated");
      return;
    }

    setIsGeneratingKey(true);
    try {
      const newPrivateKey = generatePrivateKey();
      const result = userLocalKeyStorage.set(newPrivateKey);

      if (result.success) {
        setUserLocalKey(newPrivateKey);
        const publicKeyResult = validateAndSetPublicKey(newPrivateKey);

        if (publicKeyResult && publicKeyResult.publicKey && currentUser?.id) {
          const userId = currentUser.id;
          // Sign the user UUID and store in database
          const signingResult = await signUserUuidWithPrivateKey(
            userId,
            newPrivateKey
          );

          if (signingResult.success && signingResult.signature) {
            const storeResult = await storeUserKey({
              publicKey: publicKeyResult.publicKey,
              keyType: "secp256k1n",
              userUuid: userId,
              keySigningUuid: signingResult.signature,
            });

            if (storeResult.success) {
              toast.success(
                "New private key generated and stored successfully"
              );
              // Reload stored keys to show the new one
              await loadStoredKeys();
            } else if (storeResult.isDuplicate) {
              toast.warning(storeResult.error);
            } else {
              toast.warning("Key generated but failed to store in database");
            }
          } else {
            toast.warning("Key generated but failed to sign user UUID");
          }
        }
      } else {
        toast.error("Failed to save generated key");
      }
    } catch {
      toast.error("Failed to generate new private key");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const validateAndSetPublicKey = (privateKey: string) => {
    try {
      // Remove 0x prefix if present for VIEM
      const cleanKey = privateKey.startsWith("0x")
        ? privateKey
        : `0x${privateKey}`;
      const account = privateKeyToAccount(cleanKey as `0x${string}`);
      setPublicKey(account.address);
      setUserLocalKeyError(null);
      return { success: true, publicKey: account.address };
    } catch {
      setPublicKey(null);
      setUserLocalKeyError("Invalid private key format");
      return { success: false, publicKey: null };
    }
  };

  const handleUserLocalKeyChange = async (value: string) => {
    setUserLocalKey(value);

    // Clear error when user starts typing
    if (userLocalKeyError) {
      setUserLocalKeyError(null);
    }

    // Save to localStorage immediately if valid
    if (value.trim()) {
      const result = userLocalKeyStorage.set(value);
      if (!result.success) {
        setUserLocalKeyError(result.error || "Failed to save key");
      } else {
        // Validate with VIEM and set public key
        const validationResult = validateAndSetPublicKey(value);

        // If we have a valid public key and user, store in database
        if (
          validationResult.success &&
          validationResult.publicKey &&
          currentUser?.id
        ) {
          const userId = currentUser.id;
          const signingResult = await signUserUuidWithPrivateKey(userId, value);

          if (signingResult.success && signingResult.signature) {
            const storeResult = await storeUserKey({
              publicKey: validationResult.publicKey,
              keyType: "secp256k1n",
              userUuid: userId,
              keySigningUuid: signingResult.signature,
            });

            if (storeResult.success) {
              toast.success("Key stored successfully");
              await loadStoredKeys();
            } else if (storeResult.isDuplicate) {
              toast.warning(storeResult.error);
            } else {
              console.warn(
                "Failed to store key in database:",
                storeResult.error
              );
            }
          }
        }
      }
    } else {
      userLocalKeyStorage.remove();
      setPublicKey(null);
    }
  };

  const handleUserLocalKeyBlur = () => {
    if (userLocalKey.trim()) {
      const validation = validateUserLocalKey(userLocalKey);
      if (!validation.isValid) {
        setUserLocalKeyError(validation.error || "Invalid key format");
      } else {
        setUserLocalKeyError(null);
        // Validate with VIEM and set public key
        validateAndSetPublicKey(userLocalKey);
      }
    }
  };

  const copyUserLocalKey = async () => {
    if (!userLocalKey) {
      toast.error("No key to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(userLocalKey);
      toast.success("Key copied to clipboard");
    } catch {
      toast.error("Failed to copy key");
    }
  };

  const downloadUserLocalKey = () => {
    if (!userLocalKey) {
      toast.error("No key to copy");
      return;
    }

    const blob = new Blob([userLocalKey], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-local-key.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Key downloaded successfully");
  };

  const deleteStoredKey = async (keyId: number) => {
    if (!currentUser?.id) return;

    try {
      const result = await deleteUserKeyById(keyId, currentUser.id);
      if (result.success) {
        toast.success("Key deleted successfully");
        await loadStoredKeys();
      } else {
        toast.error(result.error || "Failed to delete key");
      }
    } catch (error) {
      toast.error("Failed to delete key");
      console.error(error);
    }
  };

  if (!isDebugMode) {
    return null;
  }

  return (
    <Card className="w-full col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Data Authenticity Certifying Private Key</span>
          <span className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            <Bug className="h-4 w-4" />
            Debug Mode
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="userLocalKey" className="block text-sm font-medium">
              Private Key
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateNewPrivateKey}
              disabled={isGeneratingKey || !currentUser?.id}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Generate new private key"
            >
              <RefreshCw
                className={`h-4 w-4 ${isGeneratingKey ? "animate-spin" : ""}`}
              />
              {isGeneratingKey ? "Generating..." : "Generate New"}
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Input
                  id="userLocalKey"
                  type={showUserLocalKey ? "text" : "password"}
                  value={userLocalKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUserLocalKeyChange(e.target.value)
                  }
                  onBlur={handleUserLocalKeyBlur}
                  placeholder="Enter your private key"
                  className={`pr-12 ${userLocalKeyError ? "border-red-500 focus:border-red-500" : ""}`}
                  autoComplete="off"
                  data-form-type="other"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowUserLocalKey(!showUserLocalKey)}
                >
                  {showUserLocalKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyUserLocalKey}
                disabled={!userLocalKey || !!userLocalKeyError}
                title="Copy key to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadUserLocalKey}
                disabled={!userLocalKey || !!userLocalKeyError}
                title="Download key as file"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* Public Key Display */}
            {publicKey && (
              <div className="max-w-md">
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Account Address:</span>
                  <span className="font-mono text-xs break-all">
                    {publicKey}
                  </span>
                </div>
              </div>
            )}

            {userLocalKeyError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {userLocalKeyError}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This key is only used locally and stored on this device. On new
            devices, you will need to upload it again or create a new one.
            {!userLocalKey &&
              " A new key will be automatically generated for you."}
          </p>

          {/* Stored Keys List */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Your Stored Keys</h3>
            {isLoadingKeys ? (
              <div className="text-sm text-muted-foreground">
                Loading keys...
              </div>
            ) : storedKeys.length > 0 ? (
              <div className="space-y-2">
                {storedKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-green-600" />
                        <span className="font-mono text-xs break-all">
                          {key.publicKey}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Type: {key.keyType} • Created:{" "}
                        {new Date(key.createdAt).toLocaleDateString()}
                        {key.metadata && (
                          <>
                            <br />
                            IP: {key.metadata.ipAddress || "unknown"} • Device:{" "}
                            {key.metadata.userAgent
                              ? key.metadata.userAgent.substring(0, 50) + "..."
                              : "unknown"}
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteStoredKey(key.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete this key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No keys stored yet. Generate a new key to get started.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
