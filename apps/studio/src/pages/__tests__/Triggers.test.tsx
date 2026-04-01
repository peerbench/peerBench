import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithQueryClient } from "@/test/query-helpers";
import {
  mockTrigger,
  mockLangfuseTrigger,
  resetMockIds,
} from "@/test/api-mocks";
import { Triggers } from "../Triggers";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listTriggers: vi.fn().mockResolvedValue({ triggers: [], total: 0 }),
    listLangfuseTriggers: vi
      .fn()
      .mockResolvedValue({ triggers: [], total: 0 }),
    getTriggerConfigs: vi
      .fn()
      .mockResolvedValue({ configs: [{ id: "c1", name: "Config 1" }] }),
    getLangfuseTriggerConfigs: vi
      .fn()
      .mockResolvedValue({ configs: [{ id: "c1", name: "Config 1" }] }),
    getLangfuseStatus: vi.fn().mockResolvedValue({
      configured: true,
      host: "https://langfuse.example.com",
    }),
    getLangfusePrompts: vi
      .fn()
      .mockResolvedValue({ prompts: [{ name: "prompt-1", versions: [1, 2] }] }),
    createTrigger: vi
      .fn()
      .mockResolvedValue({ id: "t1", name: "New Trigger" }),
    createLangfuseTrigger: vi
      .fn()
      .mockResolvedValue({ id: "lt1", name: "New LF Trigger" }),
    updateTrigger: vi.fn().mockResolvedValue({}),
    updateLangfuseTrigger: vi.fn().mockResolvedValue({}),
    deleteTrigger: vi.fn().mockResolvedValue({ success: true }),
    deleteLangfuseTrigger: vi.fn().mockResolvedValue({ success: true }),
    fireTrigger: vi
      .fn()
      .mockResolvedValue({ success: true, runId: "r1" }),
    syncLangfuse: vi.fn().mockResolvedValue({
      promptsChecked: 5,
      newVersionsFound: 1,
      triggersExecuted: 0,
      errors: [],
    }),
  },
}));

function setupEmptyTriggers() {
  vi.mocked(api.listTriggers).mockResolvedValue({ triggers: [], total: 0 });
  vi.mocked(api.listLangfuseTriggers).mockResolvedValue({
    triggers: [],
    total: 0,
  });
}

describe("Triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();
    setupEmptyTriggers();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows loading state initially", () => {
    vi.mocked(api.listTriggers).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listLangfuseTriggers).mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<Triggers />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders trigger lists after loading", async () => {
    const timed = mockTrigger({ name: "Hourly FNOL" });
    const langfuse = mockLangfuseTrigger({ name: "Prompt Watcher" });

    vi.mocked(api.listTriggers).mockResolvedValue({
      triggers: [timed],
      total: 1,
    });
    vi.mocked(api.listLangfuseTriggers).mockResolvedValue({
      triggers: [langfuse],
      total: 1,
    });

    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(screen.getByText("Hourly FNOL")).toBeInTheDocument();
    });
    expect(screen.getByText("Prompt Watcher")).toBeInTheDocument();
    expect(screen.getByText(/2 triggers/)).toBeInTheDocument();
  });

  it("shows empty state when no triggers", async () => {
    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(screen.getByText("No triggers configured.")).toBeInTheDocument();
    });

    expect(screen.getByText("Create your first trigger")).toBeInTheDocument();
  });

  it("search input calls API with search term", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(api.listTriggers).toHaveBeenCalled();
    });

    vi.mocked(api.listTriggers).mockClear();
    vi.mocked(api.listLangfuseTriggers).mockClear();

    const searchInput = screen.getByPlaceholderText("Search triggers...");
    await user.type(searchInput, "daily");

    await waitFor(() => {
      expect(api.listTriggers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "daily" }),
      );
    });
  });

  it("new timed trigger form toggle", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(api.listTriggers).toHaveBeenCalled();
    });

    expect(screen.queryByText("Trigger Type")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New Trigger" }));

    expect(screen.getByText("Trigger Type")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Timed (Scheduled)" }),
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("e.g., Daily FNOL Benchmark"),
    ).toBeInTheDocument();
  });

  it("new langfuse trigger form toggle", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(api.listTriggers).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: "New Trigger" }));

    expect(screen.getByText("Trigger Type")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Langfuse (Prompt Change)" }),
    );

    expect(
      screen.getByPlaceholderText("e.g., FNOL System Prompt Changes"),
    ).toBeInTheDocument();
  });

  it("timed trigger enable/disable toggle calls api.updateTrigger", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const trigger = mockTrigger({ name: "Toggle Me", enabled: 1 });

    vi.mocked(api.listTriggers).mockResolvedValue({
      triggers: [trigger],
      total: 1,
    });

    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(screen.getByText("Toggle Me")).toBeInTheDocument();
    });

    expect(screen.getByText("Active")).toBeInTheDocument();

    const triggerCard = screen
      .getByText("Toggle Me")
      .closest("[data-slot='card']")!;
    const toggleButton = triggerCard.querySelector(
      "button[data-size='icon-sm']",
    ) as HTMLElement;

    expect(toggleButton).not.toBeNull();
    await user.click(toggleButton);

    await waitFor(() => {
      expect(api.updateTrigger).toHaveBeenCalledWith(trigger.id, {
        enabled: false,
      });
    });
  });

  it("fire timed trigger button calls api.fireTrigger", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const trigger = mockTrigger({ name: "Fire Me" });

    vi.mocked(api.listTriggers).mockResolvedValue({
      triggers: [trigger],
      total: 1,
    });

    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(screen.getByText("Fire Me")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Run Now" }));

    await waitFor(() => {
      expect(api.fireTrigger).toHaveBeenCalledWith(trigger.id);
    });
  });

  it("delete timed trigger confirm flow", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const trigger = mockTrigger({ name: "Delete Timed" });

    vi.mocked(api.listTriggers).mockResolvedValue({
      triggers: [trigger],
      total: 1,
    });

    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(screen.getByText("Delete Timed")).toBeInTheDocument();
    });

    const triggerCard = screen
      .getByText("Delete Timed")
      .closest("[data-slot='card']")!;
    const deleteButton = Array.from(
      triggerCard.querySelectorAll("button"),
    ).find((btn) => btn.textContent === "Delete") as HTMLElement;

    expect(deleteButton).not.toBeNull();
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Delete?")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(api.deleteTrigger).toHaveBeenCalledWith(trigger.id);
    });
  });

  it("langfuse trigger enable/disable toggle calls api.updateLangfuseTrigger", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const trigger = mockLangfuseTrigger({
      name: "Toggle LF",
      enabled: 1,
    });

    vi.mocked(api.listLangfuseTriggers).mockResolvedValue({
      triggers: [trigger],
      total: 1,
    });

    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(screen.getByText("Toggle LF")).toBeInTheDocument();
    });

    const triggerCard = screen
      .getByText("Toggle LF")
      .closest("[data-slot='card']")!;
    const toggleButton = triggerCard.querySelector(
      "button[data-size='icon-sm']",
    ) as HTMLElement;

    expect(toggleButton).not.toBeNull();
    await user.click(toggleButton);

    await waitFor(() => {
      expect(api.updateLangfuseTrigger).toHaveBeenCalledWith(trigger.id, {
        enabled: false,
      });
    });
  });

  it("langfuse sync button calls api.syncLangfuse", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(api.listTriggers).toHaveBeenCalled();
    });

    const syncButton = screen.getByRole("button", { name: "Sync Langfuse" });
    expect(syncButton).toBeInTheDocument();

    await user.click(syncButton);

    await waitFor(() => {
      expect(api.syncLangfuse).toHaveBeenCalled();
    });
  });

  it("delete langfuse trigger confirm flow", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const trigger = mockLangfuseTrigger({ name: "Delete LF" });

    vi.mocked(api.listLangfuseTriggers).mockResolvedValue({
      triggers: [trigger],
      total: 1,
    });

    renderWithQueryClient(<Triggers />);

    await waitFor(() => {
      expect(screen.getByText("Delete LF")).toBeInTheDocument();
    });

    const triggerCard = screen
      .getByText("Delete LF")
      .closest("[data-slot='card']")!;
    const deleteButton = Array.from(
      triggerCard.querySelectorAll("button"),
    ).find((btn) => btn.textContent === "Delete") as HTMLElement;

    expect(deleteButton).not.toBeNull();
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Delete?")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(api.deleteLangfuseTrigger).toHaveBeenCalledWith(trigger.id);
    });
  });
});
