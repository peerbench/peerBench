import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSelect } from "@/components/ui/FilterSelect";

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

describe("FilterSelect", () => {
  it("renders label and placeholder", () => {
    render(
      <FilterSelect
        label="Status"
        value={undefined}
        onValueChange={() => {}}
        placeholder="All statuses"
        options={["pending", "running"]}
      />,
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("All statuses")).toBeInTheDocument();
  });

  it("shows selected value when provided", () => {
    render(
      <FilterSelect
        label="Status"
        value="running"
        onValueChange={() => {}}
        placeholder="All statuses"
        options={["pending", "running"]}
      />,
    );

    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("calls onValueChange with value when option selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSelect
        label="Status"
        value={undefined}
        onValueChange={onChange}
        placeholder="All statuses"
        options={["pending", "running"]}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("running"));

    expect(onChange).toHaveBeenCalledWith("running");
  });

  it("calls onValueChange with null when 'all' option selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSelect
        label="Status"
        value="running"
        onValueChange={onChange}
        placeholder="All statuses"
        options={["pending", "running"]}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("All statuses"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("handles object options ({ value, label })", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSelect
        label="Agent"
        value={undefined}
        onValueChange={onChange}
        placeholder="All agents"
        options={[
          { value: "agent-1", label: "Agent One" },
          { value: "agent-2", label: "Agent Two" },
        ]}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Agent One"));

    expect(onChange).toHaveBeenCalledWith("agent-1");
  });

  it("applies custom triggerClassName", () => {
    render(
      <FilterSelect
        label="Status"
        value={undefined}
        onValueChange={() => {}}
        placeholder="All statuses"
        options={["pending"]}
        triggerClassName="h-8 text-xs"
      />,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger.className).toContain("h-8");
    expect(trigger.className).toContain("text-xs");
  });

  it("applies custom labelClassName", () => {
    render(
      <FilterSelect
        label="Status"
        value={undefined}
        onValueChange={() => {}}
        placeholder="All statuses"
        options={["pending"]}
        labelClassName="text-xs text-gray-500"
      />,
    );

    const label = screen.getByText("Status");
    expect(label.className).toContain("text-xs");
    expect(label.className).toContain("text-gray-500");
  });

  it("respects disabled prop", () => {
    render(
      <FilterSelect
        label="Status"
        value={undefined}
        onValueChange={() => {}}
        placeholder="All statuses"
        options={["pending"]}
        disabled
      />,
    );

    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
