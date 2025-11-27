import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideKey } from "lucide-react";
import Link from "next/link";

export function SecuritySection() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LucideKey className="h-5 w-5" />
          Security
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-2">Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click below to change your password.
            </p>
            <Button asChild variant="outline" size="default">
              <Link href="/reset-password">Change Password</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
