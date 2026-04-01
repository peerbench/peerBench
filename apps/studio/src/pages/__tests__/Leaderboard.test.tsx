import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import { mockLeaderboardEntry, resetMockIds } from "@/test/api-mocks";
import { Leaderboard } from "../Leaderboard";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getFilteredLeaderboard: vi.fn().mockResolvedValue({ entries: [] }),
    getLeaderboardFilters: vi.fn().mockResolvedValue({
      runners: [],
      scorers: [],
      tags: [],
      providers: [],
      agents: [],
      configs: [],
    }),
  },
}));

const defaultFilters = {
  runners: ["runner-a", "runner-b"],
  scorers: ["scorer-a"],
  providers: ["openai", "anthropic"],
  agents: [
    { id: "agent-1", name: "Agent One", provider: "openai" },
    { id: "agent-2", name: "Agent Two", provider: "anthropic" },
  ],
  configs: [
    { id: "cfg-1", name: "Config Alpha" },
    { id: "cfg-2", name: "Config Beta" },
  ],
  tags: ["stable", "nightly"],
};

describe("Leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();

    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries: [] });
    vi.mocked(api.getLeaderboardFilters).mockResolvedValue(defaultFilters);
  });

  it("shows loading state initially", () => {
    vi.mocked(api.getFilteredLeaderboard).mockReturnValue(
      new Promise(() => {}),
    );

    renderWithQueryClient(<Leaderboard />);

    expect(screen.getByText("Loading leaderboard...")).toBeInTheDocument();
  });

  it("renders entries in table after load", async () => {
    const entries = [
      mockLeaderboardEntry({ rank: 1, agentName: "Alpha Agent" }),
      mockLeaderboardEntry({ rank: 2, agentName: "Beta Agent" }),
    ];
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries });

    renderWithQueryClient(<Leaderboard />);

    expect(await screen.findByText("Alpha Agent")).toBeInTheDocument();
    expect(screen.getByText("Beta Agent")).toBeInTheDocument();
  });

  it("shows empty state message when no entries match", async () => {
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries: [] });

    renderWithQueryClient(<Leaderboard />);

    expect(
      await screen.findByText("No data available for the selected filters."),
    ).toBeInTheDocument();
  });

  it("renders summary stat cards with correct totals", async () => {
    const entries = [
      mockLeaderboardEntry({ runCount: 10, resultCount: 100 }),
      mockLeaderboardEntry({ runCount: 5, resultCount: 50 }),
    ];
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries });

    renderWithQueryClient(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText("Targets")).toBeInTheDocument();
    });

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("renders filter control labels", async () => {
    renderWithQueryClient(<Leaderboard />);

    await waitFor(() => {
      expect(api.getLeaderboardFilters).toHaveBeenCalled();
    });

    expect(screen.getByText("Time Range")).toBeInTheDocument();
    expect(screen.getByText("Runner")).toBeInTheDocument();
    expect(screen.getByText("Scorer")).toBeInTheDocument();
    expect(screen.getByText("Provider")).toBeInTheDocument();
    expect(screen.getByText("Config")).toBeInTheDocument();
    expect(screen.getByText("Min Results")).toBeInTheDocument();
  });

  it("renders tag filter buttons when tags are available", async () => {
    renderWithQueryClient(<Leaderboard />);

    expect(await screen.findByText("#stable")).toBeInTheDocument();
    expect(screen.getByText("#nightly")).toBeInTheDocument();
  });

  it("does not render tags section when no tags are available", async () => {
    vi.mocked(api.getLeaderboardFilters).mockResolvedValue({
      ...defaultFilters,
      tags: [],
    });

    renderWithQueryClient(<Leaderboard />);

    await waitFor(() => {
      expect(api.getLeaderboardFilters).toHaveBeenCalled();
    });

    expect(screen.queryByText("Tags")).not.toBeInTheDocument();
  });

  it("shows clear all button with active filter count", async () => {
    renderWithQueryClient(<Leaderboard />, {
      searchParams: { runner: "runner-a", scorer: "scorer-a" },
    });

    expect(await screen.findByText("Clear all (2)")).toBeInTheDocument();
  });

  it("clear all resets URL params", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Leaderboard />, {
      searchParams: { runner: "runner-a", scorer: "scorer-a" },
    });

    const clearBtn = await screen.findByText("Clear all (2)");
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Clear all/)).not.toBeInTheDocument();
    });
  });

  it("changing a filter triggers re-fetch", async () => {
    renderWithQueryClient(<Leaderboard />, {
      searchParams: {},
    });

    await waitFor(() => {
      expect(api.getFilteredLeaderboard).toHaveBeenCalledTimes(1);
    });

    renderWithQueryClient(<Leaderboard />, {
      searchParams: { runner: "runner-a" },
    });

    await waitFor(() => {
      expect(api.getFilteredLeaderboard).toHaveBeenCalledTimes(2);
    });
  });

  it("compare mode checkbox toggles compare column header", async () => {
    const user = userEvent.setup();
    const entries = [mockLeaderboardEntry({ rank: 1 })];
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries });

    renderWithQueryClient(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText("Rank")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("columnheader", { name: /compare/i }),
    ).not.toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", {
      name: /head-to-head comparison mode/i,
    });
    await user.click(checkbox);

    expect(
      screen.getByRole("columnheader", { name: /compare/i }),
    ).toBeInTheDocument();
  });

  it("group by prompt version checkbox adds Prompt column", async () => {
    const user = userEvent.setup();
    const entries = [
      mockLeaderboardEntry({
        rank: 1,
        systemPromptId: "prompt-1",
        systemPromptVersion: 2,
      }),
    ];
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries });

    renderWithQueryClient(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText("Rank")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("columnheader", { name: /prompt/i }),
    ).not.toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", {
      name: /group by prompt version/i,
    });
    await user.click(checkbox);

    await waitFor(() => {
      expect(
        screen.getByRole("columnheader", { name: /prompt/i }),
      ).toBeInTheDocument();
    });
  });

  it("agent names link to agents page", async () => {
    const entries = [
      mockLeaderboardEntry({ rank: 1, agentName: "My Agent" }),
    ];
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries });

    renderWithQueryClient(<Leaderboard />);

    const link = await screen.findByRole("link", { name: "My Agent" });
    expect(link).toHaveAttribute(
      "href",
      `/agents?search=${encodeURIComponent("My Agent")}`,
    );
  });

  it("displays scores formatted as percentages", async () => {
    const entries = [
      mockLeaderboardEntry({
        rank: 1,
        avgScore: 0.85,
        minScore: 0.5,
        maxScore: 1.0,
      }),
    ];
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries });

    renderWithQueryClient(<Leaderboard />);

    expect(await screen.findByText("85.0%")).toBeInTheDocument();
    expect(
      screen.getByText((_content, element) => {
        return element?.textContent === "50.0% / 100.0%";
      }),
    ).toBeInTheDocument();
  });

  it("renders rank badges with correct styling for top 3", async () => {
    const entries = [
      mockLeaderboardEntry({ rank: 1, agentName: "Gold Agent" }),
      mockLeaderboardEntry({ rank: 2, agentName: "Silver Agent" }),
      mockLeaderboardEntry({ rank: 3, agentName: "Bronze Agent" }),
    ];
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries });

    renderWithQueryClient(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText("Gold Agent")).toBeInTheDocument();
    });

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const dataRows = rows.slice(1);

    const getBadge = (row: HTMLElement) =>
      within(row).getByText(/^\d+$/, {
        selector: "span.rounded-full",
      });

    expect(getBadge(dataRows[0]).className).toContain("bg-yellow-100");
    expect(getBadge(dataRows[1]).className).toContain("bg-muted");
    expect(getBadge(dataRows[2]).className).toContain("bg-orange-100");
  });

  it("compare button appears when 2+ agents are selected in compare mode", async () => {
    const user = userEvent.setup();
    const entries = [
      mockLeaderboardEntry({
        rank: 1,
        agentId: "agent-1",
        agentName: "Agent A",
      }),
      mockLeaderboardEntry({
        rank: 2,
        agentId: "agent-2",
        agentName: "Agent B",
      }),
    ];
    vi.mocked(api.getFilteredLeaderboard).mockResolvedValue({ entries });

    renderWithQueryClient(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText("Agent A")).toBeInTheDocument();
    });

    const compareModeCheckbox = screen.getByRole("checkbox", {
      name: /head-to-head comparison mode/i,
    });
    await user.click(compareModeCheckbox);

    const checkboxes = screen.getAllByRole("checkbox");
    const agentCheckboxes = checkboxes.filter(
      (cb) => !cb.closest("label"),
    );

    await user.click(agentCheckboxes[0]);
    expect(screen.queryByText(/^Compare \(/)).not.toBeInTheDocument();

    await user.click(agentCheckboxes[1]);
    expect(screen.getByText("Compare (2)")).toBeInTheDocument();
  });
});
