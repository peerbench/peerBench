"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface MessageModalProps {
  open?: boolean;
  onClose?: () => void;
  title?: string;
  message: React.ReactNode;
  buttonText?: string;
  icon?: React.ReactNode;
}

export function MessageModal({
  open,
  onClose,
  title = "Message",
  message,
  buttonText = "OK",
  icon,
}: MessageModalProps) {
  const [isOpen, setIsOpen] = useState(open ?? true);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose?.();
    }
    setIsOpen(open);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  useEffect(() => {
    if (open === undefined) return;
    setIsOpen(open);
  }, [open]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icon || <InfoIcon className="h-5 w-5 text-muted-foreground" />}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <div className="text-muted-foreground text-sm pt-2">{message}</div>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose} variant="default">
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
