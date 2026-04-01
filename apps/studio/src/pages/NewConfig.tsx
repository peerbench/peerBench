import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigForm } from "./new-config/ConfigForm";
import { RawJsonConfig } from "./new-config/RawJsonConfig";

export function NewConfig() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon-sm">
          <Link to="/configs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Create a new benchmark configuration
          </p>
        </div>
      </div>

      <Tabs defaultValue="form">
        <TabsList>
          <TabsTrigger value="form">Form</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="form">
          <ConfigForm />
        </TabsContent>
        <TabsContent value="raw">
          <RawJsonConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
