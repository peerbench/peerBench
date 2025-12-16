"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { OpenRouterProvider, GoogleLLMProvider } from "peerbench";
import { toast } from "react-toastify";
import { useSettingOpenRouterKey } from "@/lib/hooks/settings/use-setting-openrouter-key";
import { useSettingGoogleKey } from "@/lib/hooks/settings/use-setting-google-key";
import Image from "next/image";
import { useOpenRouterServerKey } from "@/lib/react-query/use-openrouter-server-key";

export function ApiKeysSection() {
  const [openRouterApiKey, setOpenRouterApiKey] = useSettingOpenRouterKey();
  const [openRouterApiKeyInput, setOpenRouterApiKeyInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [showServerKeyOption, setShowServerKeyOption] = useState(false);
  const { data: openRouterServerKey } = useOpenRouterServerKey();

  const [geminiApiKey, setGeminiApiKey] = useSettingGoogleKey();
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState("");
  const [isCheckingGemini, setIsCheckingGemini] = useState(false);

  const checkServerKey = useCallback(async () => {
    if (openRouterServerKey === undefined) {
      return;
    }

    // Show server key option only if it's different from the current active key
    setShowServerKeyOption(openRouterServerKey !== openRouterApiKey);
  }, [openRouterServerKey, openRouterApiKey]);

  const handleUseServerKey = async () => {
    if (openRouterServerKey) {
      setOpenRouterApiKey(openRouterServerKey);
      setShowServerKeyOption(false);
      setOpenRouterApiKeyInput("");
      toast.success("Your API key is updated");
    }
  };

  const handleCheckOpenRouterKey = async () => {
    setIsChecking(true);
    await new OpenRouterProvider({ apiKey: openRouterApiKeyInput ?? "" })
      .validateApiKey()
      .then(() => toast.success("API key is valid"))
      .catch(() => toast.error("Invalid API key"))
      .finally(() => setIsChecking(false));
  };

  const handleOnSaveClick = () => {
    if (openRouterApiKeyInput) {
      setOpenRouterApiKey(openRouterApiKeyInput);
      setOpenRouterApiKeyInput("");
    }
    if (geminiApiKeyInput) {
      setGeminiApiKey(geminiApiKeyInput);
      setGeminiApiKeyInput("");
    }
    if (openRouterApiKeyInput || geminiApiKeyInput) {
      toast.success("Done");
    }
  };

  const handleOpenRouterApiKeyInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOpenRouterApiKeyInput(e.target.value);
  };

  const handleCheckGeminiKey = async () => {
    setIsCheckingGemini(true);
    await new GoogleLLMProvider({ apiKey: geminiApiKeyInput ?? "" })
      .getModels()
      .then(() => toast.success("API key is valid"))
      .catch(() => toast.error("Invalid API key"))
      .finally(() => setIsCheckingGemini(false));
  };

  const handleGeminiApiKeyInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setGeminiApiKeyInput(e.target.value);
  };

  // Check for server-side API key
  useEffect(() => {
    checkServerKey();
  }, [checkServerKey]);

  return (
    <Card className="w-full col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Keys</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your API keys will be stored in your browser&apos;s localStorage.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OpenRouter API Key */}
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium mb-2"
              >
                <span className="flex items-center gap-2">
                  <Image
                    src="/openrouter.svg"
                    alt="OpenRouter"
                    width={24}
                    height={24}
                  />
                  OpenRouter API Key
                </span>
              </label>
              {openRouterApiKey && (
                <p className="text-sm font-bold text-green-500 my-2">
                  Current active key is ending with ...
                  {openRouterApiKey.slice(-6)}
                </p>
              )}

              {/* Server Key Option */}
              {showServerKeyOption && openRouterServerKey && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg my-2">
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Auto generated API key available
                      </p>
                      <p className="text-xs text-blue-600">
                        This key is auto generated for your account. Ending with
                        ...{openRouterServerKey.slice(-6)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUseServerKey}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Use Auto Generated Key
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowServerKeyOption(false)}
                        className="text-gray-500"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="apiKey"
                  value={openRouterApiKeyInput}
                  onChange={handleOpenRouterApiKeyInputChange}
                  placeholder="Enter your new OpenRouter API key"
                  className="flex-1"
                  autoComplete="off"
                  data-form-type="other"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckOpenRouterKey}
                  disabled={isChecking}
                >
                  {isChecking ? "Checking..." : "Check"}
                </Button>
              </div>
            </div>

            {/* Gemini API Key */}
            <div>
              <label
                htmlFor="geminiApiKey"
                className="block text-sm font-medium mb-2"
              >
                <span className="flex items-center gap-2">
                  <Image
                    src="/gemini.svg"
                    alt="Gemini"
                    width={24}
                    height={24}
                  />
                  Gemini API Key
                </span>
              </label>
              {geminiApiKey && (
                <p className="text-sm font-bold text-green-500 my-2">
                  Current active key is ending with ...
                  {geminiApiKey.slice(-6)}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="geminiApiKey"
                  value={geminiApiKeyInput}
                  onChange={handleGeminiApiKeyInputChange}
                  placeholder="Enter your new Gemini API key"
                  className="flex-1"
                  autoComplete="off"
                  data-form-type="other"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckGeminiKey}
                  disabled={isCheckingGemini}
                >
                  {isCheckingGemini ? "Checking..." : "Check"}
                </Button>
              </div>
            </div>
          </div>

          <div className="w-full flex justify-end">
            <Button
              onClick={handleOnSaveClick}
              variant="default"
              size="default"
            >
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
