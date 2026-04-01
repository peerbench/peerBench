import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import { QuickTest } from "../QuickTest";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listConfigs: vi.fn(),
    executeQuickTest: vi.fn(),
    getQuickTestStatus: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    validationErrors?: unknown[];
    constructor(message: string, validationErrors?: unknown[]) {
      super(message);
      this.name = "ApiError";
      this.validationErrors = validationErrors;
    }
  },
}));

const configs = [
  {
    id: "c1",
    name: "Config 1",
    description: null,
    configJson: { runner: "test-runner" },
    configHash: "h1",
    version: 1,
    runCount: 5,
    failedRunCount: 0,
    tags: [],
    isFavorite: true,
    createdBy: null,
    initialConfigId: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "c2",
    name: "Config 2",
    description: null,
    configJson: { runner: "runner-b" },
    configHash: "h2",
    version: 1,
    runCount: 3,
    failedRunCount: 0,
    tags: [],
    isFavorite: false,
    createdBy: null,
    initialConfigId: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

describe("QuickTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listConfigs).mockResolvedValue({
      configs,
      total: 2,
      availableTags: [],
    });
    vi.mocked(api.executeQuickTest).mockResolvedValue({
      runs: [
        {
          configId: "c1",
          configName: "Config 1",
          runId: "run-1",
          status: "created",
        },
      ],
    });
    vi.mocked(api.getQuickTestStatus).mockResolvedValue({ statuses: [] });
  });

  it("shows loading state initially", () => {
    renderWithQueryClient(<QuickTest />);
    expect(screen.getByText("Loading configs...")).toBeInTheDocument();
  });

  it("renders config list after loading", async () => {
    renderWithQueryClient(<QuickTest />);

    await waitFor(() => {
      expect(screen.queryByText("Loading configs...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Config 1")).toBeInTheDocument();
    expect(screen.getByText("Config 2")).toBeInTheDocument();
  });

  it("auto-selects all configs when showOnlyFavorites is true (initial state)", async () => {
    renderWithQueryClient(<QuickTest />);

    await waitFor(() => {
      expect(screen.queryByText("Loading configs...")).not.toBeInTheDocument();
    });

    expect(api.listConfigs).toHaveBeenCalledWith(
      expect.objectContaining({ favoritesOnly: true })
    );

    const runButton = screen.getByRole("button", { name: /run 2 config/i });
    expect(runButton).toBeInTheDocument();
  });

  it("toggles config selection when clicking a config checkbox", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<QuickTest />);

    await waitFor(() => {
      expect(screen.queryByText("Loading configs...")).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /run 2 config/i })
    ).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    const config1Checkbox = checkboxes.find((cb) => {
      const label = cb.closest("label");
      return label?.textContent?.includes("Config 1");
    })!;

    await user.click(config1Checkbox);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /run 1 config/i })
      ).toBeInTheDocument();
    });
  });

  it("select all and deselect all buttons work", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<QuickTest />);

    await waitFor(() => {
      expect(screen.queryByText("Loading configs...")).not.toBeInTheDocument();
    });

    const deselectAllButton = screen.getByRole("button", {
      name: /deselect all/i,
    });
    await user.click(deselectAllButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /run 0 config/i })
      ).toBeInTheDocument();
    });

    const selectAllButton = screen.getByRole("button", {
      name: /^select all$/i,
    });
    await user.click(selectAllButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /run 2 config/i })
      ).toBeInTheDocument();
    });
  });

  it("disables execute button when no configs are selected", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<QuickTest />);

    await waitFor(() => {
      expect(screen.queryByText("Loading configs...")).not.toBeInTheDocument();
    });

    const deselectAllButton = screen.getByRole("button", {
      name: /deselect all/i,
    });
    await user.click(deselectAllButton);

    await waitFor(() => {
      const runButton = screen.getByRole("button", { name: /run 0 config/i });
      expect(runButton).toBeDisabled();
    });

    expect(api.executeQuickTest).not.toHaveBeenCalled();
  });

  it("calls api.executeQuickTest on successful execute", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<QuickTest />);

    await waitFor(() => {
      expect(screen.queryByText("Loading configs...")).not.toBeInTheDocument();
    });

    const runButton = screen.getByRole("button", { name: /run 2 config/i });
    await user.click(runButton);

    await waitFor(() => {
      expect(api.executeQuickTest).toHaveBeenCalledTimes(1);
    });

    const callArg = vi.mocked(api.executeQuickTest).mock.calls[0][0];
    expect(callArg.configIds).toEqual(expect.arrayContaining(["c1", "c2"]));
  });

  it("renders endpoint override input", () => {
    renderWithQueryClient(<QuickTest />);

    const endpointInput = screen.getByPlaceholderText(
      "https://pr-123.api.renisa.ai"
    );
    expect(endpointInput).toBeInTheDocument();
  });

  it("renders max test cases input", () => {
    renderWithQueryClient(<QuickTest />);

    const maxTestCasesInput = screen.getByPlaceholderText(
      "Leave empty for all"
    );
    expect(maxTestCasesInput).toBeInTheDocument();
  });
});
