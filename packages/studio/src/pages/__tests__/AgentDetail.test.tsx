import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import {
  mockAgent,
  mockAgentOverview,
  mockAgentConfigPerformanceRow,
  mockAgentConfigTestCasePerformanceRow,
  resetMockIds,
} from "@/test/api-mocks";
import { AgentDetail } from "../AgentDetail";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getAgent: vi.fn().mockResolvedValue({}),
    getAgentOverview: vi.fn().mockResolvedValue({}),
    listAgentConfigPerformance: vi.fn().mockResolvedValue({ rows: [] }),
    listAgentConfigTestCasePerformance: vi
      .fn()
      .mockResolvedValue({ rows: [] }),
    triggerAgentHealthCheck: vi
      .fn()
      .mockResolvedValue({ result: { status: "healthy" } }),
  },
}));

vi.mock("@/components/AgentName", () => ({
  AgentName: ({ name }: { name: string }) => <span>{name}</span>,
}));

const AGENT = mockAgent({
  id: "agent-1",
  agentId: "test-agent",
  name: "Test Agent",
  provider: "openai",
  endpointUrl: "https://api.example.com/agent-1",
  description: "A test agent description",
});

const OVERVIEW = mockAgentOverview({
  runCount: 12,
  resultCount: 60,
  scoredCount: 55,
  avgScore: 0.82,
  lastRunAt: "2025-06-15T10:30:00Z",
});

function setupDefaultMocks() {
  vi.mocked(api.getAgent).mockResolvedValue(AGENT);
  vi.mocked(api.getAgentOverview).mockResolvedValue(OVERVIEW);
  vi.mocked(api.listAgentConfigPerformance).mockResolvedValue({
    rows: [
      mockAgentConfigPerformanceRow({
        configId: "cfg-1",
        configName: "Config Alpha",
        runCount: 5,
        resultCount: 25,
        scoredCount: 20,
        avgScore: 0.9,
        lastRunAt: "2025-06-15T10:30:00Z",
      }),
      mockAgentConfigPerformanceRow({
        configId: "cfg-2",
        configName: "Config Beta",
        runCount: 3,
        resultCount: 15,
        scoredCount: 12,
        avgScore: 0.75,
        lastRunAt: "2025-06-14T08:00:00Z",
      }),
    ],
  });
  vi.mocked(api.listAgentConfigTestCasePerformance).mockResolvedValue({
    rows: [],
  });
}

function renderPage() {
  return renderWithQueryClient(<AgentDetail />, {
    path: "/agents/:id",
    route: "/agents/agent-1",
  });
}

describe("AgentDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();
  });

  it("shows loading state", () => {
    vi.mocked(api.getAgent).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getAgentOverview).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listAgentConfigPerformance).mockReturnValue(
      new Promise(() => {}),
    );
    renderPage();

    expect(screen.getByText("Loading\u2026")).toBeInTheDocument();
  });

  it("renders agent header with name, provider, and endpoint", async () => {
    setupDefaultMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/openai.*api\.example\.com/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A test agent description"),
    ).toBeInTheDocument();
  });

  it("renders stats cards with correct values", async () => {
    setupDefaultMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("55 scored")).toBeInTheDocument();
    expect(screen.getByText("82.0%")).toBeInTheDocument();
  });

  it("renders config performance table with rows", async () => {
    setupDefaultMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Config Alpha")).toBeInTheDocument();
    });

    expect(screen.getByText("Config Beta")).toBeInTheDocument();
    expect(
      screen.getByText("Performance by Config"),
    ).toBeInTheDocument();
  });

  it("shows 'Select a config' message before any config is selected", async () => {
    setupDefaultMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Select a config above to see test case performance."),
    ).toBeInTheDocument();
    expect(screen.getByText("Select a config")).toBeInTheDocument();
  });

  it("clicking a config row triggers test case load", async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    vi.mocked(api.listAgentConfigTestCasePerformance).mockResolvedValue({
      rows: [
        mockAgentConfigTestCasePerformanceRow({
          configId: "cfg-1",
          testCaseId: "tc-1",
          testCaseName: "Test Case One",
        }),
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Config Alpha")).toBeInTheDocument();
    });

    const row = screen.getByText("Config Alpha").closest("tr")!;
    await user.click(row.querySelector("td:nth-child(2)")!);

    await waitFor(() => {
      expect(
        api.listAgentConfigTestCasePerformance,
      ).toHaveBeenCalledWith("agent-1", {
        configId: "cfg-1",
        limit: 200,
      });
    });
  });

  it("renders test case rows after a config is selected", async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    vi.mocked(api.listAgentConfigTestCasePerformance).mockResolvedValue({
      rows: [
        mockAgentConfigTestCasePerformanceRow({
          configId: "cfg-1",
          testCaseId: "tc-1",
          testCaseName: "Test Case One",
        }),
        mockAgentConfigTestCasePerformanceRow({
          configId: "cfg-1",
          testCaseId: "tc-2",
          testCaseName: "Test Case Two",
        }),
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Config Alpha")).toBeInTheDocument();
    });

    const row = screen.getByText("Config Alpha").closest("tr")!;
    await user.click(row.querySelector("td:nth-child(2)")!);

    await waitFor(() => {
      expect(screen.getByText("Test Case One")).toBeInTheDocument();
    });
    expect(screen.getByText("Test Case Two")).toBeInTheDocument();
  });

  it("back button links to /agents", async () => {
    setupDefaultMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });

    const backLink = screen.getByRole("link", { name: /Back/ });
    expect(backLink).toHaveAttribute("href", "/agents");
  });

  it("config names in the table link to /configs/:id", async () => {
    setupDefaultMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Config Alpha")).toBeInTheDocument();
    });

    const configLink = screen.getByRole("link", { name: "Config Alpha" });
    expect(configLink).toHaveAttribute("href", "/configs/cfg-1");

    const configLink2 = screen.getByRole("link", { name: "Config Beta" });
    expect(configLink2).toHaveAttribute("href", "/configs/cfg-2");
  });

  it("shows empty state when agent has no config results", async () => {
    vi.mocked(api.getAgent).mockResolvedValue(AGENT);
    vi.mocked(api.getAgentOverview).mockResolvedValue(OVERVIEW);
    vi.mocked(api.listAgentConfigPerformance).mockResolvedValue({
      rows: [],
    });
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("No results for this agent yet."),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when selected config has no test cases", async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    vi.mocked(api.listAgentConfigTestCasePerformance).mockResolvedValue({
      rows: [],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Config Alpha")).toBeInTheDocument();
    });

    const row = screen.getByText("Config Alpha").closest("tr")!;
    await user.click(row.querySelector("td:nth-child(2)")!);

    await waitFor(() => {
      expect(
        screen.getByText("No test case results for this selection yet."),
      ).toBeInTheDocument();
    });
  });

  it("renders health status card with Never checked", async () => {
    setupDefaultMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Health")).toBeInTheDocument();
    });

    expect(screen.getByText("Never checked")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Check Now" }),
    ).toBeInTheDocument();
  });

  it("renders health status card with healthy status", async () => {
    vi.mocked(api.getAgent).mockResolvedValue({
      ...AGENT,
      lastHealthCheck: {
        id: "hc-1",
        agentId: "agent-1",
        runId: null,
        status: "healthy",
        statusCode: 200,
        responseTimeMs: 150,
        checkedPath: "/health",
        errorMessage: null,
        checkedAt: new Date().toISOString(),
      },
    });
    vi.mocked(api.getAgentOverview).mockResolvedValue(OVERVIEW);
    vi.mocked(api.listAgentConfigPerformance).mockResolvedValue({ rows: [] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });
  });

  it("Check Now button calls triggerAgentHealthCheck", async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    vi.mocked(api.triggerAgentHealthCheck).mockResolvedValue({
      result: {
        id: "hc-new",
        agentId: "agent-1",
        runId: null,
        status: "healthy",
        statusCode: 200,
        responseTimeMs: 100,
        checkedPath: "/health",
        errorMessage: null,
        checkedAt: new Date().toISOString(),
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Health")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Check Now" }));

    await waitFor(() => {
      expect(api.triggerAgentHealthCheck).toHaveBeenCalledWith("agent-1");
    });
  });
});
