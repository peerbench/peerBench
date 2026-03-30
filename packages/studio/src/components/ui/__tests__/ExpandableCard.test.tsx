import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpandableCard } from "@/components/ui/ExpandableCard";

describe("ExpandableCard", () => {
  it("renders header and description", () => {
    render(
      <ExpandableCard
        isExpanded={false}
        onToggle={() => {}}
        header={<h3>Test Header</h3>}
        description="Test description"
      >
        <p>Content</p>
      </ExpandableCard>,
    );

    expect(screen.getByText("Test Header")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("does not show children when collapsed", () => {
    render(
      <ExpandableCard
        isExpanded={false}
        onToggle={() => {}}
        header={<h3>Header</h3>}
      >
        <p>Hidden Content</p>
      </ExpandableCard>,
    );

    expect(screen.queryByText("Hidden Content")).not.toBeInTheDocument();
  });

  it("shows children when expanded", () => {
    render(
      <ExpandableCard
        isExpanded={true}
        onToggle={() => {}}
        header={<h3>Header</h3>}
      >
        <p>Visible Content</p>
      </ExpandableCard>,
    );

    expect(screen.getByText("Visible Content")).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <ExpandableCard
        isExpanded={false}
        onToggle={onToggle}
        header={<h3>Clickable Header</h3>}
      >
        <p>Content</p>
      </ExpandableCard>,
    );

    await user.click(screen.getByText("Clickable Header"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders headerRight next to the chevron", () => {
    render(
      <ExpandableCard
        isExpanded={false}
        onToggle={() => {}}
        header={<h3>Header</h3>}
        headerRight={<span>3 fields</span>}
      >
        <p>Content</p>
      </ExpandableCard>,
    );

    expect(screen.getByText("3 fields")).toBeInTheDocument();
  });

  it("omits description when not provided", () => {
    const { container } = render(
      <ExpandableCard
        isExpanded={false}
        onToggle={() => {}}
        header={<h3>Header</h3>}
      >
        <p>Content</p>
      </ExpandableCard>,
    );

    const descriptions = container.querySelectorAll(".text-muted-foreground.mt-2");
    expect(descriptions).toHaveLength(0);
  });
});
