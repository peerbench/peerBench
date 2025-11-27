import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideAlertCircle } from "lucide-react";
import Link from "next/link";

export default function ErrorForm() {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <LucideAlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-card-foreground"></CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-lg text-muted-foreground">
            Invalid reset link
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 text-center"
            >
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
