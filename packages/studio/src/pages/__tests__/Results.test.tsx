import { screen, waitFor } from "@testing-library/react";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import { mockResultExplorerRow, resetMockIds } from "@/test/api-mocks";
import { Results } from "../Results";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listAllResults: vi.fn().mockResolvedValue({ results: [], total: 0 }),
    getResultFilterOptions: vi.fn().mockResolvedValue({
      statuses: ["completed", "failed"],
      runners: ["runner-a"],
      scorers: ["scorer-a"],
      agents: [{ id: "a1", name: "Agent 1" }],
      configs: [{ id: "c1", name: "Config 1" }],
    }),
  },
}));

vi.mock("@/components/ui/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/components/ui/ScoreBadge", () => ({
  ScoreBadge: ({ score }: { score: number | null }) => (
    <span>{score ?? "—"}</span>
  ),
}));

vi.mock("@/components/AgentName", () => ({
  AgentName: ({ name }: { name: string }) => <span>{name}</span>,
}));

const mockResults = [
  mockResultExplorerRow({
    id: "r1",
    runId: "run-1",
    testCaseId: "tc-1",
    agentId: "a1",
    modelSlug: "gpt-4",
    agentEndpointUrl: "https://api.com",
    agentProvider: "openai",
    status: "completed",
    errorMessage: null,
    response: { text: "hello" },
    score: { value: 0.9 },
    testCase: { input: "test" },
    scoreValue: 0.9,
    durationMs: 500,
    ttftMs: null,
    inputTokensUsed: 100,
    outputTokensUsed: 50,
    createdAt: "2025-01-01T00:00:00Z",
    configId: "c1",
    configName: "Config 1",
    runner: "runner-a",
    scorer: "scorer-a",
  }),
];

describe("Results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();

    vi.mocked(api.listAllResults).mockResolvedValue({
      results: [],
      total: 0,
    });
  });

  it("shows loading state initially", () => {
    vi.mocked(api.listAllResults).mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<Results />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders results table after loading", async () => {
    vi.mocked(api.listAllResults).mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    renderWithQueryClient(<Results />);

    await waitFor(() => {
      expect(screen.getByText("run-1")).toBeInTheDocument();
    });

    expect(screen.getByText("Config 1")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it('shows "No results found." when empty', async () => {
    vi.mocked(api.listAllResults).mockResolvedValue({
      results: [],
      total: 0,
    });

    renderWithQueryClient(<Results />);

    await waitFor(() => {
      expect(screen.getByText("No results found.")).toBeInTheDocument();
    });
  });

  it("shows total count", async () => {
    vi.mocked(api.listAllResults).mockResolvedValue({
      results: mockResults,
      total: 42,
    });

    renderWithQueryClient(<Results />);

    await waitFor(() => {
      expect(screen.getByText("42 results")).toBeInTheDocument();
    });
  });

  it("shows clear all filters button with count when filters active", async () => {
    vi.mocked(api.listAllResults).mockResolvedValue({
      results: [],
      total: 0,
    });

    renderWithQueryClient(<Results />, {
      searchParams: { status: "completed", runner: "runner-a" },
    });

    await waitFor(() => {
      expect(screen.getByText("Clear all (2)")).toBeInTheDocument();
    });
  });

  it("row click navigates to result detail page", async () => {
    vi.mocked(api.listAllResults).mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    renderWithQueryClient(<Results />);

    await waitFor(() => {
      expect(screen.getByText("run-1")).toBeInTheDocument();
    });

    const row = screen.getByText("run-1").closest("tr");
    expect(row).toBeTruthy();
    expect(row).toHaveClass("cursor-pointer");
  });

  it("shows pagination controls when total exceeds page size", async () => {
    const results = Array.from({ length: 50 }, (_, i) =>
      mockResultExplorerRow({ id: `r-${i}` }),
    );
    vi.mocked(api.listAllResults).mockResolvedValue({
      results,
      total: 120,
    });

    renderWithQueryClient(<Results />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /previous/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("does not show pagination when total fits one page", async () => {
    vi.mocked(api.listAllResults).mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    renderWithQueryClient(<Results />);

    await waitFor(() => {
      expect(screen.getByText("run-1")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("renders filter labels for config, status, runner, scorer, and agent", async () => {
    vi.mocked(api.listAllResults).mockResolvedValue({
      results: [],
      total: 0,
    });

    renderWithQueryClient(<Results />);

    await waitFor(() => {
      expect(screen.getByText("No results found.")).toBeInTheDocument();
    });

    expect(screen.getByText("Config")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Runner")).toBeInTheDocument();
    expect(screen.getByText("Scorer")).toBeInTheDocument();
    expect(screen.getByText("Score min")).toBeInTheDocument();
    expect(screen.getByText("Score max")).toBeInTheDocument();
    expect(screen.getByText("Test Case ID")).toBeInTheDocument();
    expect(screen.getByText("Result ID")).toBeInTheDocument();
    expect(screen.getByText("Run ID")).toBeInTheDocument();
    expect(screen.getByText("Config Name")).toBeInTheDocument();
  });
});
