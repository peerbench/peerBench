import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import { mockRun, resetMockIds } from "@/test/api-mocks";
import { Runs } from "../Runs";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listRuns: vi.fn().mockResolvedValue({ runs: [], total: 0 }),
    getRunFilterOptions: vi.fn().mockResolvedValue({
      runners: ["runner-a"],
      scorers: ["scorer-a"],
      sources: ["web"],
      statuses: ["completed", "failed"],
      configTags: ["tag-a"],
      agents: [{ id: "agent-1", name: "Agent 1" }],
      providers: ["openai"],
    }),
    getConfigStats: vi.fn().mockResolvedValue({
      dailyScoresByTarget: [],
      targetSummaries: [],
      overallStats: { totalRuns: 0, completedRuns: 0, avgScore: null },
    }),
  },
}));

vi.mock("react-chartjs-2", () => ({
  Line: () => <canvas data-testid="chart-line" />,
}));

vi.mock("chart.js/auto", () => ({}));

vi.mock("@/components/ui/data-table", () => ({
  DataTable: ({ table, isLoading, emptyMessage }: any) => {
    if (isLoading) return <div>Loading...</div>;
    const rows = table.getRowModel().rows;
    if (rows.length === 0) return <div>{emptyMessage}</div>;
    return (
      <div data-testid="data-table">
        {rows.map((row: any) => (
          <div key={row.id} data-testid="run-row">
            {row.original.id}
          </div>
        ))}
      </div>
    );
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

vi.mock("@/components/ui/TriggerSourceBadge", () => ({
  TriggerSourceBadge: () => null,
}));

describe("Runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();

    vi.mocked(api.listRuns).mockResolvedValue({ runs: [], total: 0 });
  });

  it("shows loading state initially", () => {
    vi.mocked(api.listRuns).mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<Runs />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders runs after loading", async () => {
    const runs = [mockRun({ id: "run-1" }), mockRun({ id: "run-2" })];
    vi.mocked(api.listRuns).mockResolvedValue({ runs, total: 2 });

    renderWithQueryClient(<Runs />);

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId("run-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("run-1");
    expect(rows[1]).toHaveTextContent("run-2");
  });

  it("shows empty state message when no runs match", async () => {
    vi.mocked(api.listRuns).mockResolvedValue({ runs: [], total: 0 });

    renderWithQueryClient(<Runs />);

    await waitFor(() => {
      expect(
        screen.getByText("No benchmark runs found."),
      ).toBeInTheDocument();
    });
  });

  it("shows filtered empty message when filters are active", async () => {
    vi.mocked(api.listRuns).mockResolvedValue({ runs: [], total: 0 });

    renderWithQueryClient(<Runs />, {
      searchParams: { status: "failed" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("No runs match the current filters."),
      ).toBeInTheDocument();
    });
  });

  it("shows total count text", async () => {
    vi.mocked(api.listRuns).mockResolvedValue({
      runs: [mockRun()],
      total: 42,
    });

    renderWithQueryClient(<Runs />);

    await waitFor(() => {
      expect(screen.getByText("42 total runs")).toBeInTheDocument();
    });
  });

  it("toggles practice runs checkbox and re-fetches", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Runs />);

    await waitFor(() => {
      expect(api.listRuns).toHaveBeenCalledTimes(1);
    });

    const checkbox = screen.getByRole("checkbox", {
      name: /show practice runs/i,
    });

    await user.click(checkbox);

    await waitFor(() => {
      expect(api.listRuns).toHaveBeenCalledWith(
        expect.objectContaining({ includePracticeRuns: true }),
      );
    });
  });

  it("shows pagination controls when total exceeds page size", async () => {
    const runs = Array.from({ length: 25 }, () => mockRun());
    vi.mocked(api.listRuns).mockResolvedValue({ runs, total: 60 });

    renderWithQueryClient(<Runs />);

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
    });

    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /next/i }),
    ).toBeEnabled();
  });

  it("does not show pagination when total fits one page", async () => {
    vi.mocked(api.listRuns).mockResolvedValue({
      runs: [mockRun()],
      total: 1,
    });

    renderWithQueryClient(<Runs />);

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("shows clear all filters button when filters are active", async () => {
    renderWithQueryClient(<Runs />, {
      searchParams: { status: "completed" },
    });

    await waitFor(() => {
      expect(screen.getByText("Clear all filters")).toBeInTheDocument();
    });
  });

  it("does not show clear all filters button without active filters", async () => {
    renderWithQueryClient(<Runs />);

    await waitFor(() => {
      expect(api.listRuns).toHaveBeenCalled();
    });

    expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
  });

  it("shows config stats panel when configId search param is set", async () => {
    renderWithQueryClient(<Runs />, {
      searchParams: { configId: "cfg-123" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Performance Overview"),
      ).toBeInTheDocument();
    });

    expect(api.getConfigStats).toHaveBeenCalledWith("cfg-123", {
      days: 30,
    });
  });
});
