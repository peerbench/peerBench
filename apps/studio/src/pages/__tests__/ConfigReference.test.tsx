import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/render-helpers";
import { ConfigReference } from "../ConfigReference";

const GROUP_TITLES = [
  "Runner",
  "Targets",
  "Test Cases",
  "Test Case Sources - Supabase (InsuredQA)",
  "Test Case Sources - DQ Supabase (Conversation Logs)",
  "System Prompt",
  "Scorer Configuration",
  "Model Parameters",
  "Execution Settings",
  "Metadata",
];

describe("ConfigReference", () => {
  it("renders page title", () => {
    renderWithRouter(<ConfigReference />);

    expect(screen.getByText("Configuration Reference")).toBeInTheDocument();
  });

  it("renders all group cards", () => {
    renderWithRouter(<ConfigReference />);

    for (const title of GROUP_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("groups are collapsed by default", () => {
    renderWithRouter(<ConfigReference />);

    expect(screen.queryByText("runner")).not.toBeInTheDocument();
    expect(screen.queryByText(/targets\[\]\.provider/)).not.toBeInTheDocument();
  });

  it("click expands a group and shows its fields", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ConfigReference />);

    await user.click(screen.getByText("Runner"));

    expect(screen.getByText("runner")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Runner implementation name\. Must match a registered runner/,
      ),
    ).toBeInTheDocument();
  });

  it("click again collapses an expanded group", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ConfigReference />);

    await user.click(screen.getByText("Runner"));
    expect(screen.getByText("runner")).toBeInTheDocument();

    await user.click(screen.getByText("Runner"));
    expect(screen.queryByText(/Runner implementation name/)).not.toBeInTheDocument();
  });

  it("Expand All expands all groups", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ConfigReference />);

    await user.click(screen.getByRole("button", { name: "Expand All" }));

    expect(screen.getByText("runner")).toBeInTheDocument();
    expect(screen.getByText("targets[].provider")).toBeInTheDocument();
    expect(screen.getByText("testCasesSchemaKind")).toBeInTheDocument();
    expect(screen.getByText("systemPrompt")).toBeInTheDocument();
    expect(screen.getByText("scorer")).toBeInTheDocument();
    expect(screen.getByText("temperature")).toBeInTheDocument();
    expect(screen.getByText("maxParallel")).toBeInTheDocument();
    expect(screen.getByText("tags")).toBeInTheDocument();
  });

  it("Collapse All collapses all groups after expanding", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ConfigReference />);

    await user.click(screen.getByRole("button", { name: "Expand All" }));
    expect(screen.getByText("runner")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse All" }));
    expect(screen.queryByText(/Runner implementation name/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/targets\[\]\.provider/),
    ).not.toBeInTheDocument();
  });

  it("example config code block is shown", () => {
    renderWithRouter(<ConfigReference />);

    const heading = screen.getByText("Example Configuration");
    expect(heading).toBeInTheDocument();

    const card = heading.closest(".p-4") as HTMLElement;
    const pre = within(card).getByText(/single-turn-reference-comparison/);
    expect(pre).toBeInTheDocument();
  });
});
