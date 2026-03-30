import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import { mockConfig, resetMockIds } from "@/test/api-mocks";
import { Configs } from "../Configs";

// Radix UI Select uses browser APIs that jsdom does not implement.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listConfigs: vi.fn().mockResolvedValue({
      configs: [],
      total: 0,
      availableTags: [],
    }),
    deleteConfig: vi.fn().mockResolvedValue({ success: true }),
    toggleConfigFavorite: vi.fn().mockResolvedValue({ isFavorite: true }),
  },
}));

vi.mock("@/components/LocalConfigImport", () => ({
  LocalConfigImport: () => <div data-testid="local-config-import" />,
}));

vi.mock("@/components/ui/JsonDisplay", () => ({
  JsonDisplay: () => <div data-testid="json-display" />,
}));

function setupWithConfigs(
  configs = [
    mockConfig({ name: "Alpha Config" }),
    mockConfig({ name: "Beta Config" }),
  ],
  availableTags: string[] = [],
) {
  vi.mocked(api.listConfigs).mockResolvedValue({
    configs,
    total: configs.length,
    availableTags,
  });
}

describe("Configs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();
  });

  it('shows "Loading..." when loading', () => {
    vi.mocked(api.listConfigs).mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<Configs />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders config list after loading", async () => {
    setupWithConfigs();
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("Alpha Config")).toBeInTheDocument();
    });
    expect(screen.getByText("Beta Config")).toBeInTheDocument();
  });

  it('shows empty state "No configurations found" when configs is empty', async () => {
    vi.mocked(api.listConfigs).mockResolvedValue({
      configs: [],
      total: 0,
      availableTags: [],
    });
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(
        screen.getByText("No configurations found."),
      ).toBeInTheDocument();
    });
  });

  it("shows total count", async () => {
    setupWithConfigs();
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("2 configurations")).toBeInTheDocument();
    });
  });

  it("search filtering - typing in search input triggers reload", async () => {
    setupWithConfigs();
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("Alpha Config")).toBeInTheDocument();
    });

    vi.mocked(api.listConfigs).mockClear();

    const searchInput = screen.getByPlaceholderText(
      "Search by name or description...",
    );
    await userEvent.type(searchInput, "Beta");

    await waitFor(() => {
      expect(api.listConfigs).toHaveBeenCalled();
    });

    const lastCall = vi.mocked(api.listConfigs).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ search: "Beta" });
  });

  it("tag toggle - clicking tag button toggles selection", async () => {
    setupWithConfigs(
      [mockConfig({ name: "Alpha Config" })],
      ["frontend", "backend"],
    );
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("#frontend")).toBeInTheDocument();
    });

    vi.mocked(api.listConfigs).mockClear();

    await userEvent.click(screen.getByText("#frontend"));

    await waitFor(() => {
      expect(api.listConfigs).toHaveBeenCalled();
    });

    const lastCall = vi.mocked(api.listConfigs).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ tags: ["frontend"] });
  });

  it("OR/AND mode toggle", async () => {
    setupWithConfigs(
      [mockConfig({ name: "Alpha Config" })],
      ["frontend", "backend"],
    );
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("#frontend")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("#frontend"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "AND" }),
      ).toBeInTheDocument();
    });

    vi.mocked(api.listConfigs).mockClear();

    await userEvent.click(screen.getByRole("button", { name: "AND" }));

    await waitFor(() => {
      expect(api.listConfigs).toHaveBeenCalled();
    });

    const lastCall = vi.mocked(api.listConfigs).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ tagMode: "and" });
  });

  it("clear tags button", async () => {
    setupWithConfigs(
      [mockConfig({ name: "Alpha Config" })],
      ["frontend", "backend"],
    );
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("#frontend")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("#frontend"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Clear" }),
      ).toBeInTheDocument();
    });

    vi.mocked(api.listConfigs).mockClear();

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(api.listConfigs).toHaveBeenCalled();
    });

    const lastCall = vi.mocked(api.listConfigs).mock.calls.at(-1)?.[0];
    expect(lastCall?.tags).toBeUndefined();
  });

  it("order by selection changes", async () => {
    setupWithConfigs();
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("Alpha Config")).toBeInTheDocument();
    });

    vi.mocked(api.listConfigs).mockClear();

    const trigger = screen.getByRole("combobox");
    fireEvent.pointerDown(trigger, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });

    const nameOption = await screen.findByRole("option", { name: "Name" });
    fireEvent.click(nameOption);

    await waitFor(() => {
      expect(api.listConfigs).toHaveBeenCalled();
    });

    const lastCall = vi.mocked(api.listConfigs).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ orderBy: "name" });
  });

  it("delete confirm flow - click Delete -> Yes calls api.deleteConfig", async () => {
    const config = mockConfig({ name: "Deletable Config" });
    setupWithConfigs([config]);
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("Deletable Config")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Yes" }),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(api.deleteConfig).toHaveBeenCalledWith(config.id);
    });
  });

  it("delete cancel flow", async () => {
    setupWithConfigs([mockConfig({ name: "Keep Me" })]);
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("Keep Me")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "No" }),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "No" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    expect(api.deleteConfig).not.toHaveBeenCalled();
  });

  it("favorite toggle calls api.toggleConfigFavorite", async () => {
    const config = mockConfig({ name: "Fav Config", isFavorite: false });
    setupWithConfigs([config]);
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("Fav Config")).toBeInTheDocument();
    });

    const favButton = screen.getByTitle("Add to favorites");
    await userEvent.click(favButton);

    await waitFor(() => {
      expect(api.toggleConfigFavorite).toHaveBeenCalledWith(config.id);
    });
  });

  it("local import section expand/collapse", async () => {
    setupWithConfigs();
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(
        screen.getByText("Import from Local Files"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("local-config-import"),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Import from Local Files"));

    expect(screen.getByTestId("local-config-import")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Import from Local Files"));

    expect(
      screen.queryByTestId("local-config-import"),
    ).not.toBeInTheDocument();
  });

  it('"New Configuration" button is present and links to create page', async () => {
    setupWithConfigs();
    renderWithQueryClient(<Configs />);

    await waitFor(() => {
      expect(screen.getByText("Alpha Config")).toBeInTheDocument();
    });

    const newButton = screen.getByRole("button", {
      name: /new configuration/i,
    });
    expect(newButton).toBeInTheDocument();
  });
});
