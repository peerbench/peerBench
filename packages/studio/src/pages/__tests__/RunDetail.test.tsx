import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import { mockRun, mockResult, resetMockIds } from "@/test/api-mocks";
import { RunDetail } from "../RunDetail";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getRun: vi.fn(),
    getRunResults: vi.fn(),
    cancelRun: vi.fn(),
  },
}));

vi.mock("react-json-view-lite", () => ({
  JsonView: () => <div data-testid="json-view" />,
  defaultStyles: {},
}));

const renderRunDetail = () =>
  renderWithQueryClient(<RunDetail />, {
    path: "/runs/:id",
    route: "/runs/run-123",
  });

const defaultRun = () =>
  mockRun({
    id: "run-123",
    status: "completed",
    totalTestCases: 10,
    completedTestCases: 10,
    successfulTestCases: 8,
    failedTestCases: 2,
    avgScore: 0.85,
    errorMessage: null,
  });

const defaultResults = () => [
  mockResult({
    id: "res-1",
    runId: "run-123",
    testCaseId: "tc-abc123456789",
    modelSlug: "gpt-4",
    status: "success",
    scoreValue: 0.95,
    durationMs: 450,
    response: { text: "Hello" },
    testCase: { input: "Hi" },
    score: { value: 0.95 },
  }),
  mockResult({
    id: "res-2",
    runId: "run-123",
    testCaseId: "tc-def987654321",
    modelSlug: "gpt-4",
    status: "failed",
    scoreValue: 0.3,
    durationMs: 800,
    errorMessage: "timeout",
  }),
];

function setupMocks(
  run = defaultRun(),
  results = defaultResults(),
) {
  vi.mocked(api.getRun).mockResolvedValue(run);
  vi.mocked(api.getRunResults).mockResolvedValue({
    results,
    total: results.length,
  });
}

describe("RunDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();
  });

  it("shows loading state initially", () => {
    vi.mocked(api.getRun).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getRunResults).mockReturnValue(new Promise(() => {}));

    renderRunDetail();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows failure state when getRun rejects", async () => {
    vi.mocked(api.getRun).mockRejectedValue(new Error("Network error"));
    vi.mocked(api.getRunResults).mockResolvedValue({
      results: [],
      total: 0,
    });

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Failed to load run.")).toBeInTheDocument();
    });
  });

  it("renders stats cards with correct values", async () => {
    setupMocks(
      mockRun({
        id: "run-123",
        status: "completed",
        totalTestCases: 15,
        completedTestCases: 12,
        successfulTestCases: 9,
        failedTestCases: 3,
        avgScore: 0.85,
      }),
    );

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Total Tests")).toBeInTheDocument();
    });

    expect(screen.getByText("Total Tests")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Successful")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Avg Score")).toBeInTheDocument();
  });

  it("renders status badge with run status", async () => {
    setupMocks(
      mockRun({ id: "run-123", status: "failed" }),
    );

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Run Details")).toBeInTheDocument();
    });

    const heading = screen.getByText("Run Details").closest("h1")!;
    expect(within(heading).getByText("Failed")).toBeInTheDocument();
  });

  it("renders breadcrumb with truncated run ID", async () => {
    setupMocks();

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("run-123...")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "Runs" })).toHaveAttribute(
      "href",
      "/runs",
    );
  });

  it("shows progress bar for running runs", async () => {
    setupMocks(
      mockRun({
        id: "run-123",
        status: "running",
        totalTestCases: 20,
        completedTestCases: 10,
      }),
    );

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Run in Progress")).toBeInTheDocument();
    });

    expect(screen.getByText("10 / 20 completed")).toBeInTheDocument();
    expect(
      screen.getByText("10 test cases remaining"),
    ).toBeInTheDocument();
  });

  it("shows cancel button for running runs and calls cancelRun on click", async () => {
    const user = userEvent.setup();
    const cancelledRun = mockRun({
      id: "run-123",
      status: "failed",
    });
    vi.mocked(api.cancelRun).mockResolvedValue(cancelledRun);
    setupMocks(
      mockRun({
        id: "run-123",
        status: "running",
        totalTestCases: 10,
        completedTestCases: 5,
      }),
    );

    renderRunDetail();

    const cancelButton = await screen.findByRole("button", {
      name: "Cancel Run",
    });
    expect(cancelButton).toBeInTheDocument();

    await user.click(cancelButton);

    await waitFor(() => {
      expect(api.cancelRun).toHaveBeenCalledWith("run-123");
    });
  });

  it("does not show cancel button for completed runs", async () => {
    setupMocks(
      mockRun({ id: "run-123", status: "completed" }),
    );

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Run Details")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "Cancel Run" }),
    ).not.toBeInTheDocument();
  });

  it("shows error message panel when run has errorMessage", async () => {
    setupMocks(
      mockRun({
        id: "run-123",
        status: "failed",
        errorMessage: "Something went terribly wrong",
      }),
    );

    renderRunDetail();

    await waitFor(() => {
      expect(
        screen.getByText("Something went terribly wrong"),
      ).toBeInTheDocument();
    });
  });

  it("renders results table with result data", async () => {
    setupMocks();

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Test Case")).toBeInTheDocument();
    });

    expect(screen.getByText("Target")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Duration / TTFT")).toBeInTheDocument();
    expect(screen.getByText("Tokens (In/Out)")).toBeInTheDocument();

    expect(screen.getByText("tc-abc123456...")).toBeInTheDocument();
    expect(screen.getByText("tc-def987654...")).toBeInTheDocument();
  });

  it("renders filter controls", async () => {
    setupMocks();

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Status:")).toBeInTheDocument();
    });

    expect(screen.getByText("Sort:")).toBeInTheDocument();
    expect(screen.getByText("Test Case:")).toBeInTheDocument();

    const statusSelect = screen.getByDisplayValue("All");
    expect(statusSelect).toBeInTheDocument();

    const sortSelect = screen.getByDisplayValue("Default");
    expect(sortSelect).toBeInTheDocument();
  });

  it("shows empty results message when no results", async () => {
    setupMocks(defaultRun(), []);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("No results yet.")).toBeInTheDocument();
    });
  });

  it("displays results count in heading", async () => {
    setupMocks();

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText(/Results \(2\)/)).toBeInTheDocument();
    });
  });

  it("shows progress bar for pending runs", async () => {
    setupMocks(
      mockRun({
        id: "run-123",
        status: "pending",
        totalTestCases: 5,
        completedTestCases: 0,
      }),
    );

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Run in Progress")).toBeInTheDocument();
    });

    expect(screen.getByText("0 / 5 completed")).toBeInTheDocument();
    expect(screen.getByText("5 test cases remaining")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel Run" }),
    ).toBeInTheDocument();
  });

  it("shows Configuration section with View Config link", async () => {
    setupMocks(
      mockRun({ id: "run-123", configId: "cfg-abc" }),
    );

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Configuration")).toBeInTheDocument();
    });

    const viewConfigLink = screen.getByRole("link", { name: "View Config" });
    expect(viewConfigLink).toHaveAttribute("href", "/configs/cfg-abc");
  });

  describe("test case agreement", () => {
    // Multi-target results with 3 test cases × 2 targets, threshold at 50%:
    //   tc-aaa: gpt-4 right (0.8), claude-3 wrong (0.2) → disagreement
    //   tc-bbb: gpt-4 right (0.9), claude-3 right (0.7) → both pass
    //   tc-ccc: gpt-4 wrong (0.1), claude-3 wrong (0.15) → hardest
    const multiTargetResults = () => [
      mockResult({
        id: "res-1",
        runId: "run-123",
        testCaseId: "tc-aaa111111111",
        modelSlug: "gpt-4",
        status: "success",
        scoreValue: 0.8,
        durationMs: 400,
      }),
      mockResult({
        id: "res-2",
        runId: "run-123",
        testCaseId: "tc-aaa111111111",
        modelSlug: "claude-3",
        status: "success",
        scoreValue: 0.2,
        durationMs: 350,
      }),
      mockResult({
        id: "res-3",
        runId: "run-123",
        testCaseId: "tc-bbb222222222",
        modelSlug: "gpt-4",
        status: "success",
        scoreValue: 0.9,
        durationMs: 300,
      }),
      mockResult({
        id: "res-4",
        runId: "run-123",
        testCaseId: "tc-bbb222222222",
        modelSlug: "claude-3",
        status: "success",
        scoreValue: 0.7,
        durationMs: 500,
      }),
      mockResult({
        id: "res-5",
        runId: "run-123",
        testCaseId: "tc-ccc333333333",
        modelSlug: "gpt-4",
        status: "success",
        scoreValue: 0.1,
        durationMs: 600,
      }),
      mockResult({
        id: "res-6",
        runId: "run-123",
        testCaseId: "tc-ccc333333333",
        modelSlug: "claude-3",
        status: "success",
        scoreValue: 0.15,
        durationMs: 550,
      }),
    ];

    function setupMultiTargetMocks(results = multiTargetResults()) {
      vi.mocked(api.getRun).mockResolvedValue(
        mockRun({
          id: "run-123",
          status: "completed",
          totalTestCases: 3,
          completedTestCases: 6,
          successfulTestCases: 6,
          failedTestCases: 0,
          avgScore: 0.475,
        }),
      );
      vi.mocked(api.getRunResults).mockResolvedValue({
        results,
        total: results.length,
      });
    }

    async function setThreshold(
      user: ReturnType<typeof userEvent.setup>,
      value: string,
    ) {
      const input = screen.getByPlaceholderText("%");
      await user.clear(input);
      await user.type(input, value);
    }

    it("shows Hardest Test Cases when threshold set with multiple targets", async () => {
      const user = userEvent.setup();
      setupMultiTargetMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Performance by Target")).toBeInTheDocument();
      });

      await setThreshold(user, "50");

      await waitFor(() => {
        expect(screen.getByText("Hardest Test Cases")).toBeInTheDocument();
      });

      expect(screen.getByText("2 of 2 targets failed")).toBeInTheDocument();
      expect(screen.getByText("1 of 2 targets failed")).toBeInTheDocument();
    });

    it("hides Hardest Test Cases when threshold is cleared", async () => {
      const user = userEvent.setup();
      setupMultiTargetMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Hardest Test Cases")).toBeInTheDocument();
      });

      // Clear the threshold
      const input = screen.getByPlaceholderText("%");
      await user.clear(input);

      await waitFor(() => {
        expect(
          screen.queryByText("Hardest Test Cases"),
        ).not.toBeInTheDocument();
      });
    });

    it("hides agreement features for single-target runs", async () => {
      setupMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Run Details")).toBeInTheDocument();
      });

      expect(
        screen.queryByText("Performance by Target"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Hardest Test Cases"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Min right:")).not.toBeInTheDocument();
      expect(screen.queryByText("Min wrong:")).not.toBeInTheDocument();
    });

    it("clicking a hardest test case filters results to that case", async () => {
      const user = userEvent.setup();
      setupMultiTargetMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Performance by Target")).toBeInTheDocument();
      });

      await setThreshold(user, "50");

      await waitFor(() => {
        expect(screen.getByText("Hardest Test Cases")).toBeInTheDocument();
      });

      const tcButton = screen
        .getByText("2 of 2 targets failed")
        .closest("button")!;
      await user.click(tcButton);

      await waitFor(() => {
        expect(screen.getByText(/Results \(2 of 6\)/)).toBeInTheDocument();
      });

      expect(screen.getAllByText("tc-ccc333333...")).toHaveLength(2);
      expect(
        screen.queryByText("tc-aaa111111..."),
      ).not.toBeInTheDocument();
    });

    it("shows agreement filter inputs with default threshold", async () => {
      setupMultiTargetMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Performance by Target")).toBeInTheDocument();
      });

      // Agreement filters visible by default (threshold defaults to 51)
      expect(screen.getByText("Min right:")).toBeInTheDocument();
      expect(screen.getByText("Min wrong:")).toBeInTheDocument();
    });

    it("hides agreement filter inputs when threshold is cleared", async () => {
      const user = userEvent.setup();
      setupMultiTargetMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Min right:")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("%");
      await user.clear(input);

      await waitFor(() => {
        expect(screen.queryByText("Min right:")).not.toBeInTheDocument();
      });
      expect(screen.queryByText("Min wrong:")).not.toBeInTheDocument();
    });

    it("filters results by min wrong count", async () => {
      const user = userEvent.setup();
      setupMultiTargetMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Performance by Target")).toBeInTheDocument();
      });

      await setThreshold(user, "50");

      await waitFor(() => {
        expect(screen.getByText("Min wrong:")).toBeInTheDocument();
      });

      const minWrongInput = screen
        .getByText("Min wrong:")
        .parentElement!.querySelector("input")!;
      await user.type(minWrongInput, "2");

      // Only tc-ccc (2 results) has wrongCount >= 2
      await waitFor(() => {
        expect(screen.getByText(/Results \(2 of 6\)/)).toBeInTheDocument();
      });
    });

    it("filters results by min right count", async () => {
      const user = userEvent.setup();
      setupMultiTargetMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Performance by Target")).toBeInTheDocument();
      });

      await setThreshold(user, "50");

      await waitFor(() => {
        expect(screen.getByText("Min right:")).toBeInTheDocument();
      });

      const minRightInput = screen
        .getByText("Min right:")
        .parentElement!.querySelector("input")!;
      await user.type(minRightInput, "2");

      // Only tc-bbb (2 results) has rightCount >= 2
      await waitFor(() => {
        expect(screen.getByText(/Results \(2 of 6\)/)).toBeInTheDocument();
      });
    });

    it("clear filters button resets agreement filters", async () => {
      const user = userEvent.setup();
      setupMultiTargetMocks();
      renderRunDetail();

      await waitFor(() => {
        expect(screen.getByText("Performance by Target")).toBeInTheDocument();
      });

      await setThreshold(user, "50");

      await waitFor(() => {
        expect(screen.getByText("Min wrong:")).toBeInTheDocument();
      });

      const minWrongInput = screen
        .getByText("Min wrong:")
        .parentElement!.querySelector("input")!;
      await user.type(minWrongInput, "2");

      await waitFor(() => {
        expect(screen.getByText(/Results \(2 of 6\)/)).toBeInTheDocument();
      });

      await user.click(screen.getByText("Clear filters"));

      await waitFor(() => {
        expect(screen.getByText(/Results \(6\)/)).toBeInTheDocument();
      });
    });
  });
});
