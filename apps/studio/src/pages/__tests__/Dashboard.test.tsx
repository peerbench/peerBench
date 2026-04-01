import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test/query-helpers";
import {
  mockConfigDashboardData,
  mockConfigDashboardSummary,
} from "@/test/api-mocks";
import { api } from "@/lib/api";
import { Dashboard } from "../Dashboard";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getDashboardStats: vi.fn(),
    getConfigStats: vi.fn(),
  },
}));

vi.mock("react-chartjs-2", () => ({
  Line: () => <canvas data-testid="chart-line" />,
}));

vi.mock("chart.js/auto", () => ({}));

vi.mock("@/components/ui/StatCard", () => ({
  StatCard: ({
    label,
    value,
    change,
  }: {
    label: string;
    value: string | number;
    change?: number;
  }) => (
    <div data-testid={`stat-${label}`}>
      <span>{value}</span>
      {change !== undefined && (
        <span data-testid={`delta-${label}`}>{change.toFixed(1)}%</span>
      )}
    </div>
  ),
}));

vi.mock("@/components/ui/ScoreBadge", () => ({
  ScoreBadge: ({ score }: { score: number | null }) => (
    <span data-testid="score-badge">
      {score !== null ? `${(score * 100).toFixed(1)}%` : "—"}
    </span>
  ),
}));

vi.mock("@/components/ui/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock("@/components/AgentName", () => ({
  AgentName: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("@/lib/format-utils", () => ({
  formatTimeAgo: (d: string | null) => (d ? "1d ago" : "Never"),
}));

const defaultData = mockConfigDashboardData();

function resetApiMocks() {
  vi.mocked(api.getDashboardStats).mockResolvedValue(defaultData);
  vi.mocked(api.getConfigStats).mockResolvedValue({
    dailyScoresByTarget: [
      {
        date: "2025-01-01",
        target: "agent-alpha",
        avgScore: 0.85,
        minScore: 0.8,
        maxScore: 0.9,
        count: 5,
        failedCount: 0,
      },
    ],
    targetSummaries: [
      {
        target: "agent-alpha",
        thisWeek: { avgScore: 0.85, count: 5, failedCount: 0 },
        lastWeek: { avgScore: 0.8, count: 4, failedCount: 1 },
        change: 0.05,
      },
    ],
    overallStats: { totalRuns: 10, completedRuns: 8, avgScore: 0.83 },
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetApiMocks();
  });

  it("shows Loading... initially", () => {
    vi.mocked(api.getDashboardStats).mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<Dashboard />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders 4 operational stat cards with correct values", async () => {
    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("stat-Runs This Week")).toHaveTextContent("12");
    expect(screen.getByTestId("stat-Failed")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-Partial")).toHaveTextContent("0");
    expect(screen.getByTestId("stat-Regressions")).toHaveTextContent("0");
  });

  it("config list renders after loading", async () => {
    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const configName = defaultData.configSummaries[0].configName;
    expect(screen.getByText(configName)).toBeInTheDocument();
  });

  it("shows empty state when no configs exist", async () => {
    vi.mocked(api.getDashboardStats).mockResolvedValue(
      mockConfigDashboardData({ configSummaries: [] })
    );

    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("No configurations found.")).toBeInTheDocument();
    });
  });

  it("shows error state when loading fails", async () => {
    vi.mocked(api.getDashboardStats).mockRejectedValue(
      new Error("Network error")
    );

    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard.")).toBeInTheDocument();
    });
  });

  it("clicking a config row expands and fetches config stats", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const configId = defaultData.configSummaries[0].configId;
    const row = screen.getByTestId(`config-row-${configId}`);
    await user.click(row);

    await waitFor(() => {
      expect(api.getConfigStats).toHaveBeenCalledWith(configId, { days: 30 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("config-drilldown")).toBeInTheDocument();
    });
  });

  it("clicking an expanded config row collapses it", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const configId = defaultData.configSummaries[0].configId;
    const row = screen.getByTestId(`config-row-${configId}`);

    await user.click(row);

    await waitFor(() => {
      expect(screen.getByTestId("config-drilldown")).toBeInTheDocument();
    });

    await user.click(row);

    await waitFor(() => {
      expect(screen.queryByTestId("config-drilldown")).not.toBeInTheDocument();
    });
  });

  it("shows regression indicator on regressed configs", async () => {
    const regressedConfig = mockConfigDashboardSummary({
      isRegressed: true,
    });

    vi.mocked(api.getDashboardStats).mockResolvedValue(
      mockConfigDashboardData({
        configSummaries: [regressedConfig],
        operationalStats: {
          ...defaultData.operationalStats,
          regressionsDetected: 1,
        },
      })
    );

    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("regression-indicator")).toBeInTheDocument();
    });

    expect(screen.getByTestId("regression-indicator")).toHaveTextContent(
      "Regression"
    );
  });

  it("renders sparkline with sparkline data", async () => {
    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const sparklineContainer = screen.getByTestId("sparkline");
    const svg = sparklineContainer.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("shows per-target breakdown for multi-target configs", async () => {
    const multiTargetConfig = mockConfigDashboardSummary({
      targetBreakdown: [
        {
          target: "agent-alpha",
          avgScore: 0.85,
          resultCount: 10,
          failedCount: 0,
        },
        {
          target: "agent-beta",
          avgScore: 0.72,
          resultCount: 8,
          failedCount: 1,
        },
      ],
    });

    vi.mocked(api.getDashboardStats).mockResolvedValue(
      mockConfigDashboardData({
        configSummaries: [multiTargetConfig],
      })
    );

    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/agent-alpha/)).toBeInTheDocument();
      expect(screen.getByText(/agent-beta/)).toBeInTheDocument();
    });
  });

  it("shows runs this week delta vs last week", async () => {
    renderWithQueryClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const runsCard = screen.getByTestId("stat-Runs This Week");
    const delta = within(runsCard).getByTestId("delta-Runs This Week");
    expect(delta).toBeInTheDocument();
  });
});
