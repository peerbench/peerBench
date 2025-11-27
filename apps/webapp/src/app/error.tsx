"use client";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";
import { errorMessage } from "@/utils/error-message";
import { LucideAlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="h-(--main-viewport-height) flex flex-col items-center justify-center">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <LucideAlertCircle size={20} />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col space-y-1">
          <p>&quot;{errorMessage(error)}&quot;</p>
          <p>
            You can try to reload the page or contact the support if the issue
            persists.
          </p>
          <Button
            variant="outline"
            className="w-fit mt-3 self-center"
            onClick={() => reset()}
          >
            Reload
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
