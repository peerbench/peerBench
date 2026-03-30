import { renderHook, act } from "@testing-library/react";
import { useDeleteConfirm } from "../useDeleteConfirm";
import { toastSuccess, toastError } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

describe("useDeleteConfirm", () => {
  const deleteFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    deleteFn.mockResolvedValue(undefined);
  });

  function renderDeleteConfirm(onSuccess?: () => void) {
    return renderHook(() =>
      useDeleteConfirm({
        deleteFn,
        successMessage: "Deleted!",
        errorMessage: "Failed to delete",
        onSuccess,
      }),
    );
  }

  it("starts with confirmingId as null", () => {
    const { result } = renderDeleteConfirm();
    expect(result.current.confirmingId).toBeNull();
  });

  it("sets confirmingId on requestDelete", () => {
    const { result } = renderDeleteConfirm();

    act(() => {
      result.current.requestDelete("item-1");
    });

    expect(result.current.confirmingId).toBe("item-1");
  });

  it("clears confirmingId on cancelDelete", () => {
    const { result } = renderDeleteConfirm();

    act(() => {
      result.current.requestDelete("item-1");
    });
    expect(result.current.confirmingId).toBe("item-1");

    act(() => {
      result.current.cancelDelete();
    });
    expect(result.current.confirmingId).toBeNull();
  });

  it("calls deleteFn, clears confirmingId and shows success toast on confirmDelete", async () => {
    const { result } = renderDeleteConfirm();

    act(() => {
      result.current.requestDelete("item-1");
    });

    await act(async () => {
      await result.current.confirmDelete("item-1");
    });

    expect(deleteFn).toHaveBeenCalledWith("item-1");
    expect(result.current.confirmingId).toBeNull();
    expect(toastSuccess).toHaveBeenCalledWith("Deleted!");
  });

  it("calls onSuccess after successful delete", async () => {
    const onSuccess = vi.fn();
    const { result } = renderDeleteConfirm(onSuccess);

    await act(async () => {
      await result.current.confirmDelete("item-1");
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows error toast and keeps confirmingId unchanged on failed delete", async () => {
    const error = new Error("Network error");
    deleteFn.mockRejectedValue(error);

    const { result } = renderDeleteConfirm();

    act(() => {
      result.current.requestDelete("item-1");
    });

    await act(async () => {
      await result.current.confirmDelete("item-1");
    });

    expect(toastError).toHaveBeenCalledWith(error, "Failed to delete");
    expect(result.current.confirmingId).toBe("item-1");
  });

  it("does not call onSuccess on failed delete", async () => {
    deleteFn.mockRejectedValue(new Error("fail"));
    const onSuccess = vi.fn();
    const { result } = renderDeleteConfirm(onSuccess);

    await act(async () => {
      await result.current.confirmDelete("item-1");
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
