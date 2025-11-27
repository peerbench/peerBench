import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PromptNotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No Prompt found</CardTitle>
        <CardDescription>
          Try to adjust your filters or come back later for new ones!
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
