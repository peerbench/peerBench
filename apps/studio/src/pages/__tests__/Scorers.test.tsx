import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithRouter } from "@/test/render-helpers";
import { mockScorerMeta, mockBenchmarkMeta, resetMockIds } from "@/test/api-mocks";
import { Scorers } from "../Scorers";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getBenchmarkMeta: vi.fn().mockResolvedValue({
      runners: [],
      scorers: [],
      schemaSets: [],
    }),
  },
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

function setupWithScorers(scorers = [
  mockScorerMeta({ name: "Correctness Scorer", requiresProvider: true }),
  mockScorerMeta({ name: "Regression Checker", requiresProvider: false }),
]) {
  vi.mocked(api.getBenchmarkMeta).mockResolvedValue(
    mockBenchmarkMeta({ scorers }),
  );
}

describe("Scorers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();
  });

  it("shows loading state", () => {
    vi.mocked(api.getBenchmarkMeta).mockReturnValue(new Promise(() => {}));
    renderWithRouter(<Scorers />);

    expect(screen.getByText("Loading scorers...")).toBeInTheDocument();
  });

  it("renders scorer cards after load", async () => {
    setupWithScorers();
    renderWithRouter(<Scorers />);

    await waitFor(() => {
      expect(screen.getByText("Correctness Scorer")).toBeInTheDocument();
    });
    expect(screen.getByText("Regression Checker")).toBeInTheDocument();
  });

  it("shows empty state when no scorers", async () => {
    vi.mocked(api.getBenchmarkMeta).mockResolvedValue(
      mockBenchmarkMeta({ scorers: [] }),
    );
    renderWithRouter(<Scorers />);

    await waitFor(() => {
      expect(screen.getByText("No scorers available.")).toBeInTheDocument();
    });
  });

  it("card shows name, badge, ID, and description", async () => {
    const scorer = mockScorerMeta({
      id: "llm-judge",
      name: "LLM Judge",
      description: "Judges responses using an LLM",
      requiresProvider: true,
    });
    setupWithScorers([scorer]);
    renderWithRouter(<Scorers />);

    await waitFor(() => {
      expect(screen.getByText("LLM Judge")).toBeInTheDocument();
    });

    expect(screen.getByText("llm-judge")).toBeInTheDocument();
    expect(screen.getByText("Judges responses using an LLM")).toBeInTheDocument();

    const badges = screen.getAllByText("Requires LLM");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("click expands to show long description and output schema", async () => {
    const user = userEvent.setup();
    const scorer = mockScorerMeta({
      name: "Schema Scorer",
      longDescription: "This is a detailed explanation of the scorer.",
      outputSchema: {
        accuracy: { type: "number", description: "Accuracy score from 0 to 1" },
      },
    });
    setupWithScorers([scorer]);
    renderWithRouter(<Scorers />);

    await waitFor(() => {
      expect(screen.getByText("Schema Scorer")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("This is a detailed explanation of the scorer."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByText("Schema Scorer"));

    expect(
      screen.getByText("This is a detailed explanation of the scorer."),
    ).toBeInTheDocument();
    expect(screen.getByText("Output Schema")).toBeInTheDocument();
    expect(screen.getByText("accuracy")).toBeInTheDocument();
    expect(screen.getByText("number")).toBeInTheDocument();
    expect(
      screen.getByText("Accuracy score from 0 to 1"),
    ).toBeInTheDocument();
  });

  it("renders info boxes for Requires LLM and Deterministic", async () => {
    setupWithScorers();
    renderWithRouter(<Scorers />);

    await waitFor(() => {
      expect(screen.getByText("Correctness Scorer")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Uses an LLM.*to evaluate responses/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Uses algorithmic rules to evaluate responses/,
      ),
    ).toBeInTheDocument();
  });

  it("click collapses an expanded card", async () => {
    const user = userEvent.setup();
    const scorer = mockScorerMeta({
      name: "Toggle Scorer",
      longDescription: "Visible when expanded only.",
    });
    setupWithScorers([scorer]);
    renderWithRouter(<Scorers />);

    await waitFor(() => {
      expect(screen.getByText("Toggle Scorer")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Toggle Scorer"));
    expect(
      screen.getByText("Visible when expanded only."),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Toggle Scorer"));
    expect(
      screen.queryByText("Visible when expanded only."),
    ).not.toBeInTheDocument();
  });
});
