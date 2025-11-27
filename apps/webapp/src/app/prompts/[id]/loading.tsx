import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="space-y-6">
          {/* Back Button Skeleton */}
          <div className="flex items-center gap-2 my-5">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Main Header Card Skeleton */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-gray-700">
                    <div className="flex items-center">
                      <Skeleton className="h-6 w-8 mr-2" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-muted-foreground text-sm">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Review Counts Section Skeleton */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <Skeleton className="h-8 w-12 mx-auto mb-1" />
                      <Skeleton className="h-3 w-8 mx-auto" />
                    </div>
                    <div className="text-center">
                      <Skeleton className="h-7 w-10 mx-auto mb-1" />
                      <Skeleton className="h-3 w-12 mx-auto" />
                    </div>
                    <div className="text-center">
                      <Skeleton className="h-7 w-10 mx-auto mb-1" />
                      <Skeleton className="h-3 w-12 mx-auto" />
                    </div>
                  </div>
                </div>

                {/* Tags Section Skeleton */}
                <div className="flex flex-wrap gap-2 col-span-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-14" />
                  <Skeleton className="h-6 w-18" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Prompt Content Card Skeleton */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-6 rounded-lg border bg-gray-50">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-6 w-3/4 mb-6" />

                {/* Question Identifiers Skeleton */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Prompt Accordion Skeleton */}
              <div className="mt-8">
                <div className="border rounded-lg">
                  <div className="pl-4 py-3 text-sm font-medium text-gray-700 border-b">
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="p-4 bg-gray-50">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />

                    {/* Full Prompt Identifiers Skeleton */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-8 flex-1" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-8 flex-1" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multiple Choice Options Skeleton */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-5 h-5" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg border-2 border-gray-200 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-6 w-8" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer Section Skeleton */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg shadow-sm">
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Performance Card Skeleton */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-36" />
              </div>
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Skeleton className="h-4 w-12" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Skeleton className="h-4 w-16" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Skeleton className="h-4 w-10" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[1, 2, 3].map((i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <Skeleton className="h-6 w-16" />
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <Skeleton className="h-4 w-8" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Metadata Card Skeleton */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg border bg-gray-50">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>

          {/* Responses Section Skeleton */}
          <Card className="shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section Skeleton */}
          <Card className="shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-16" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Bar Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    </main>
  );
}
