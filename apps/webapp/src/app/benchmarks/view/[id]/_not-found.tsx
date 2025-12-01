import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function NotFound() {
  return (
    <main className="h-(--main-viewport-height) flex items-center justify-center max-w-6xl mx-auto px-4 py-8">
      <Card className="w-[500px]">
        <CardContent className="flex flex-col items-center justify-center px-2 py-6 gap-3">
          <h1 className="text-3xl font-bold">Benchmark not found</h1>
          <p className="text-slate-600 w-[80%]">
            The benchmark you are looking for does not exist or you may not have
            the required permissions to access it.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/benchmarks/explore">Back to Benchmarks</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
