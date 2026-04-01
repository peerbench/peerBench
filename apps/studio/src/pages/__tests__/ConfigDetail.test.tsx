import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import { mockConfig, mockRun, resetMockIds } from "@/test/api-mocks";
import { ConfigDetail } from "../ConfigDetail";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getConfig: vi.fn(),
    getConfigVersions: vi.fn().mockResolvedValue({ versions: [] }),
    updateConfig: vi.fn(),
    createRun: vi.fn(),
    executeRun: vi.fn(),
    executeQuickTest: vi.fn(),
  },
}));

vi.mock("@/components/ui/JsonDisplay", () => ({
  JsonDisplay: ({ data }: { data: unknown }) => (
    <pre data-testid="json-display">{JSON.stringify(data, null, 2)}</pre>
  ),
}));

const ANCHOR_ID = "anchor-1";
const ROUTE = `/configs/${ANCHOR_ID}`;
const PATH = "/configs/:id";

function renderConfigDetail(searchParams?: Record<string, string>) {
  return renderWithQueryClient(<ConfigDetail />, {
    path: PATH,
    route: ROUTE,
    searchParams,
  });
}

function setupConfig(overrides?: Parameters<typeof mockConfig>[0]) {
  const config = mockConfig({
    id: ANCHOR_ID,
    name: "My Test Config",
    description: "A test configuration",
    configJson: {
      runner: "test-runner",
      targets: [{ endpoint: "https://api.example.com" }],
    },
    configHash: "deadbeef",
    version: 3,
    runCount: 42,
    tags: ["integration", "nightly"],
    createdAt: "2025-06-15T10:00:00Z",
    initialConfigId: null,
    ...overrides,
  });
  vi.mocked(api.getConfig).mockResolvedValue(config);
  return config;
}

function setupVersions(count: number) {
  const versions = Array.from({ length: count }, (_, i) =>
    mockConfig({
      id: `version-${i + 1}`,
      name: "My Test Config",
      version: i + 1,
      configJson: { runner: "test-runner", version: i + 1 },
      configHash: `hash${i + 1}abcd`,
      initialConfigId: i === 0 ? null : ANCHOR_ID,
      createdAt: `2025-06-${String(15 + i).padStart(2, "0")}T10:00:00Z`,
    })
  );
  vi.mocked(api.getConfigVersions).mockResolvedValue({ versions });
  return versions;
}

async function waitForConfigLoaded() {
  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: "My Test Config" })
    ).toBeInTheDocument();
  });
}

describe("ConfigDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();
    vi.mocked(api.getConfigVersions).mockResolvedValue({ versions: [] });
  });

  it("shows loading state initially", () => {
    vi.mocked(api.getConfig).mockReturnValue(new Promise(() => {}));
    renderConfigDetail();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows failure state when getConfig rejects", async () => {
    vi.mocked(api.getConfig).mockRejectedValue(new Error("Network error"));
    renderConfigDetail();

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load configuration.")
      ).toBeInTheDocument();
    });
  });

  it("shows not found state when getConfig returns null", async () => {
    vi.mocked(api.getConfig).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof api.getConfig>>
    );
    renderConfigDetail();

    await waitFor(() => {
      expect(screen.getByText("Config not found")).toBeInTheDocument();
    });
  });

  it("renders config name and description", async () => {
    setupConfig();
    renderConfigDetail();

    await waitForConfigLoaded();
    expect(screen.getByText("A test configuration")).toBeInTheDocument();
  });

  it("renders stats cards (Run Count, Created, Hash)", async () => {
    setupConfig();
    renderConfigDetail();

    await waitForConfigLoaded();

    expect(screen.getByText("Run Count")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();

    expect(screen.getByText("Created")).toBeInTheDocument();
    const expectedDate = new Date("2025-06-15T10:00:00Z").toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();

    expect(screen.getByText("Hash")).toBeInTheDocument();
    expect(screen.getByText("deadbeef")).toBeInTheDocument();
  });

  it("displays tags", async () => {
    setupConfig();
    renderConfigDetail();

    await waitForConfigLoaded();

    expect(screen.getByText("integration")).toBeInTheDocument();
    expect(screen.getByText("nightly")).toBeInTheDocument();
  });

  it("calls createRun + executeRun when Run Benchmark is clicked", async () => {
    const config = setupConfig();
    const run = mockRun({ id: "run-new" });
    vi.mocked(api.createRun).mockResolvedValue(run);
    vi.mocked(api.executeRun).mockResolvedValue(run);

    renderConfigDetail();
    await waitForConfigLoaded();

    const user = userEvent.setup();
    await user.click(screen.getByText("Run Benchmark"));

    await waitFor(() => {
      expect(api.createRun).toHaveBeenCalledWith({
        configId: ANCHOR_ID,
        configSnapshot: config.configJson,
        metadata: { triggeredBy: "web" },
      });
    });

    expect(api.executeRun).toHaveBeenCalledWith("run-new");
  });

  it("shows edit form and saves name/description", async () => {
    const config = setupConfig();
    const updatedConfig = {
      ...config,
      name: "Updated Name",
      description: "Updated desc",
    };
    vi.mocked(api.updateConfig).mockResolvedValue(updatedConfig);

    renderConfigDetail();
    await waitForConfigLoaded();

    const user = userEvent.setup();

    await user.click(screen.getByTitle("Edit name and description"));

    const nameInput = screen.getByPlaceholderText("Configuration name");
    const descInput = screen.getByPlaceholderText("Optional description");

    expect(nameInput).toHaveValue("My Test Config");
    expect(descInput).toHaveValue("A test configuration");

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");
    await user.clear(descInput);
    await user.type(descInput, "Updated desc");

    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(ANCHOR_ID, {
        name: "Updated Name",
        description: "Updated desc",
      });
    });
  });

  it("cancels editing and resets form", async () => {
    setupConfig();
    renderConfigDetail();
    await waitForConfigLoaded();

    const user = userEvent.setup();
    await user.click(screen.getByTitle("Edit name and description"));

    expect(
      screen.getByPlaceholderText("Configuration name")
    ).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));

    expect(
      screen.queryByPlaceholderText("Configuration name")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "My Test Config" })
    ).toBeInTheDocument();
  });

  it("shows JSON editor with formatted JSON on Edit click", async () => {
    const config = setupConfig();
    renderConfigDetail();
    await waitForConfigLoaded();

    const user = userEvent.setup();

    const editButtons = screen.getAllByText("Edit");
    await user.click(editButtons[editButtons.length - 1]);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue(JSON.stringify(config.configJson, null, 2));
  });

  it("shows JSON error when invalid JSON is typed", async () => {
    setupConfig();
    renderConfigDetail();
    await waitForConfigLoaded();

    const user = userEvent.setup();

    const editButtons = screen.getAllByText("Edit");
    await user.click(editButtons[editButtons.length - 1]);

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "{{not valid json");

    await waitFor(() => {
      expect(screen.getByText(/JSON Error:/)).toBeInTheDocument();
    });
  });

  it("saves valid JSON via updateConfig", async () => {
    const config = setupConfig();
    const newJson = { runner: "updated-runner", targets: [] };
    const updatedConfig = {
      ...config,
      id: "new-version-id",
      configJson: newJson,
      version: 4,
    };
    vi.mocked(api.updateConfig).mockResolvedValue(updatedConfig);
    // Initial load returns empty versions (single-version mode),
    // re-fetch after save returns both versions
    vi.mocked(api.getConfigVersions)
      .mockResolvedValueOnce({ versions: [] })
      .mockResolvedValue({ versions: [config, updatedConfig] });

    renderConfigDetail();
    await waitForConfigLoaded();

    const user = userEvent.setup();

    const editButtons = screen.getAllByText("Edit");
    await user.click(editButtons[editButtons.length - 1]);

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.paste(JSON.stringify(newJson));

    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(ANCHOR_ID, {
        configJson: newJson,
      });
    });
  });

  it("copies cURL command to clipboard", async () => {
    setupConfig();

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    renderConfigDetail();
    await waitForConfigLoaded();

    fireEvent.click(screen.getByTitle("Copy cURL command to start a run"));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining(ANCHOR_ID)
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining("curl -X POST")
    );
  });

  it('shows "+ Add description" when description is null', async () => {
    setupConfig({ description: null });
    renderConfigDetail();
    await waitForConfigLoaded();

    expect(screen.getByText("+ Add description")).toBeInTheDocument();
  });

  // --- Group view with version selector tests ---

  it("redirects child config to anchor page with ?v= param", async () => {
    const childId = "child-config-1";
    const childConfig = mockConfig({
      id: childId,
      name: "My Test Config",
      initialConfigId: ANCHOR_ID,
    });
    vi.mocked(api.getConfig).mockResolvedValue(childConfig);

    renderWithQueryClient(<ConfigDetail />, {
      path: PATH,
      route: `/configs/${childId}`,
    });

    await waitFor(() => {
      expect(api.getConfig).toHaveBeenCalledWith(childId);
    });
  });

  it("renders version sidebar when multiple versions exist", async () => {
    setupConfig();
    const versions = setupVersions(3);

    renderConfigDetail();
    await waitForConfigLoaded();

    const sidebar = screen.getByTestId("version-sidebar");
    expect(sidebar).toBeInTheDocument();

    for (const v of versions) {
      expect(within(sidebar).getByText(`v${v.version}`)).toBeInTheDocument();
    }
  });

  it("selects latest version by default when no ?v= param", async () => {
    setupConfig();
    const versions = setupVersions(3);

    renderConfigDetail();
    await waitForConfigLoaded();

    const latestJson = versions[versions.length - 1].configJson;
    const jsonDisplay = screen.getByTestId("json-display");
    expect(jsonDisplay.textContent).toBe(JSON.stringify(latestJson, null, 2));
  });

  it("selects version from ?v= search param", async () => {
    setupConfig();
    const versions = setupVersions(3);

    renderConfigDetail({ v: "version-1" });
    await waitForConfigLoaded();

    const v1Json = versions[0].configJson;
    const jsonDisplay = screen.getByTestId("json-display");
    expect(jsonDisplay.textContent).toBe(JSON.stringify(v1Json, null, 2));
  });

  it("hides Edit button when non-latest version is selected", async () => {
    setupConfig();
    setupVersions(3);

    renderConfigDetail({ v: "version-1" });
    await waitForConfigLoaded();

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("shows Edit button when latest version is selected", async () => {
    setupConfig();
    setupVersions(3);

    renderConfigDetail({ v: "version-3" });
    await waitForConfigLoaded();

    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("does not render version sidebar when only one version exists", async () => {
    setupConfig();
    setupVersions(1);

    renderConfigDetail();
    await waitForConfigLoaded();

    expect(screen.queryByTestId("version-sidebar")).not.toBeInTheDocument();
  });

  it("clicking a version in sidebar updates displayed content", async () => {
    setupConfig();
    const versions = setupVersions(3);

    renderConfigDetail();
    await waitForConfigLoaded();

    const sidebar = screen.getByTestId("version-sidebar");

    const user = userEvent.setup();
    const v1Button = within(sidebar).getByText("v1").closest("button")!;
    await user.click(v1Button);

    await waitFor(() => {
      const jsonDisplay = screen.getByTestId("json-display");
      expect(jsonDisplay.textContent).toBe(
        JSON.stringify(versions[0].configJson, null, 2)
      );
    });
  });
});
