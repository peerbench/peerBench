import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import { mockAgent, resetMockIds } from "@/test/api-mocks";
import { Agents } from "../Agents";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listAgents: vi.fn().mockResolvedValue({ agents: [], total: 0 }),
    deleteAgent: vi.fn().mockResolvedValue({ success: true }),
    importAgents: vi.fn().mockResolvedValue({ imported: 2, agents: [] }),
    triggerAgentHealthCheck: vi
      .fn()
      .mockResolvedValue({ result: { status: "healthy" } }),
    triggerAllHealthChecks: vi
      .fn()
      .mockResolvedValue({ results: [], checked: 0 }),
  },
}));

vi.mock("@/components/AgentName", () => ({
  AgentName: ({ name }: { name: string }) => <span>{name}</span>,
}));

function setupWithAgents(
  agents = [
    mockAgent({ name: "Agent Alpha" }),
    mockAgent({ name: "Agent Beta" }),
  ]
) {
  vi.mocked(api.listAgents).mockResolvedValue({
    agents,
    total: agents.length,
  });
}

describe("Agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();
  });

  it("shows loading state", () => {
    vi.mocked(api.listAgents).mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<Agents />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders agents table after loading", async () => {
    setupWithAgents();
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.getByText("Agent Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("Agent Beta")).toBeInTheDocument();
  });

  it("shows empty state when no agents", async () => {
    vi.mocked(api.listAgents).mockResolvedValue({ agents: [], total: 0 });
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "No agents or endpoints registered yet. Add an agent or import from a Mastra server to get started."
        )
      ).toBeInTheDocument();
    });
  });

  it("import agents toggle shows import form", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(
      screen.queryByText("Import from Mastra Server")
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Import from Mastra" })
    );

    expect(screen.getByText("Import from Mastra Server")).toBeInTheDocument();
  });

  it("delete agent confirm flow via dropdown menu", async () => {
    const user = userEvent.setup();
    const agent = mockAgent({ name: "Deletable Agent" });
    setupWithAgents([agent]);
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.getByText("Deletable Agent")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Delete"));

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    await waitFor(() => {
      expect(screen.getByText("Confirm Delete?")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Confirm Delete?"));

    await waitFor(() => {
      expect(api.deleteAgent).toHaveBeenCalledWith(agent.id);
    });
  });

  it("renders 5-column table with correct headers", async () => {
    setupWithAgents();
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.getByText("Agent Alpha")).toBeInTheDocument();
    });

    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Endpoint")).toBeInTheDocument();
  });

  it("displays health status for agents with lastHealthCheck", async () => {
    setupWithAgents([
      mockAgent({
        name: "Healthy Agent",
        lastHealthCheck: {
          id: "hc-1",
          agentId: "a1",
          runId: null,
          status: "healthy",
          statusCode: 200,
          responseTimeMs: 150,
          checkedPath: "/health",
          errorMessage: null,
          checkedAt: new Date().toISOString(),
        },
      }),
      mockAgent({
        name: "Unhealthy Agent",
        lastHealthCheck: {
          id: "hc-2",
          agentId: "a2",
          runId: null,
          status: "unhealthy",
          statusCode: null,
          responseTimeMs: null,
          checkedPath: null,
          errorMessage: "Connection refused",
          checkedAt: new Date().toISOString(),
        },
      }),
    ]);
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });
    expect(screen.getByText("Unhealthy")).toBeInTheDocument();
  });

  it("displays Unknown status for agents without health check", async () => {
    setupWithAgents([mockAgent({ name: "Unchecked Agent" })]);
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
  });

  it("Check All button calls triggerAllHealthChecks", async () => {
    const user = userEvent.setup();
    setupWithAgents();
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.getByText("Agent Alpha")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Check All" }));

    await waitFor(() => {
      expect(api.triggerAllHealthChecks).toHaveBeenCalled();
    });
  });

  it("per-agent Health Check via dropdown menu calls triggerAgentHealthCheck", async () => {
    const user = userEvent.setup();
    const agent = mockAgent({ name: "Check Me" });
    setupWithAgents([agent]);
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.getByText("Check Me")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    await waitFor(() => {
      expect(screen.getByText("Health Check")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Health Check"));

    await waitFor(() => {
      expect(api.triggerAgentHealthCheck).toHaveBeenCalledWith(agent.id);
    });
  });

  it("agent names link to detail pages", async () => {
    const agent = mockAgent({ name: "Linked Agent" });
    setupWithAgents([agent]);
    renderWithQueryClient(<Agents />);

    await waitFor(() => {
      expect(screen.getByText("Linked Agent")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: "Linked Agent" });
    expect(link).toHaveAttribute("href", `/agents/${agent.id}`);
  });
});
