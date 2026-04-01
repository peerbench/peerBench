import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteConfirmButton } from "@/components/ui/DeleteConfirmButton";

describe("DeleteConfirmButton", () => {
  it('renders "Delete" button when not confirming', () => {
    render(
      <DeleteConfirmButton
        isConfirming={false}
        onRequestDelete={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
  });

  it("renders confirmation UI when confirming", () => {
    render(
      <DeleteConfirmButton
        isConfirming={true}
        onRequestDelete={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("calls onRequestDelete when Delete clicked", async () => {
    const user = userEvent.setup();
    const onRequestDelete = vi.fn();

    render(
      <DeleteConfirmButton
        isConfirming={false}
        onRequestDelete={onRequestDelete}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onRequestDelete).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Yes clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeleteConfirmButton
        isConfirming={true}
        onRequestDelete={() => {}}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when No clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmButton
        isConfirming={true}
        onRequestDelete={() => {}}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "No" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
