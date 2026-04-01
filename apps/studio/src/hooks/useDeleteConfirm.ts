import { useState } from "react";
import { toastError, toastSuccess } from "@/lib/toast";

export function useDeleteConfirm({
  deleteFn,
  successMessage,
  errorMessage,
  onSuccess,
}: UseDeleteConfirmOptions) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const requestDelete = (id: string) => setConfirmingId(id);
  const cancelDelete = () => setConfirmingId(null);

  const confirmDelete = async (id: string) => {
    try {
      await deleteFn(id);
      setConfirmingId(null);
      toastSuccess(successMessage);
      onSuccess?.();
    } catch (err) {
      toastError(err, errorMessage);
    }
  };

  return { confirmingId, requestDelete, confirmDelete, cancelDelete };
}

interface UseDeleteConfirmOptions {
  deleteFn: (id: string) => Promise<unknown>;
  successMessage: string;
  errorMessage: string;
  onSuccess?: () => void;
}
