import { Button } from "@/components/ui/button";

export function DeleteConfirmButton({
  isConfirming,
  onRequestDelete,
  onConfirm,
  onCancel,
}: DeleteConfirmButtonProps) {
  if (isConfirming) {
    return (
      <span className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground">Delete?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onConfirm}
          className="text-destructive hover:text-destructive"
        >
          Yes
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          No
        </Button>
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onRequestDelete}
      className="text-destructive hover:text-destructive"
    >
      Delete
    </Button>
  );
}

export interface DeleteConfirmButtonProps {
  isConfirming: boolean;
  onRequestDelete: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}
