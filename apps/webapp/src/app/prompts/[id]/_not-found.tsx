import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideArrowLeft, LucideHome } from "lucide-react";
import Link from "next/link";

export function NotFound() {
  return (
    <main className="h-(--main-viewport-height) flex items-center justify-center max-w-6xl mx-auto px-4 py-8">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            Prompt Not Found
          </CardTitle>
          <p className="text-gray-600">
            The Prompt you&apos;re looking for doesn&apos;t exist or you may not
            have enough permissions to access it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/prompts/explore">
                <LucideArrowLeft className="w-4 h-4 mr-2" />
                Back to Prompts
              </Link>
            </Button>
            <Button className="w-full sm:w-auto" asChild>
              <Link href="/">
                <LucideHome className="w-4 h-4 mr-2" />
                Home
              </Link>
            </Button>
          </div>

          <div className="text-sm text-gray-500 pt-4 border-t">
            <p>
              If you believe this is an error, please check the URL or report
              the issue.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
