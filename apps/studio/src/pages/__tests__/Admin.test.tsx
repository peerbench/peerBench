import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test/query-helpers";
import { Admin } from "../Admin";

function mockFetchSuccess(data: unknown) {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve(data),
  });
}

function mockFetchFailure(message: string) {
  return vi.fn().mockRejectedValue(new Error(message));
}

describe("Admin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders the page title", () => {
    globalThis.fetch = mockFetchSuccess({});
    renderWithQueryClient(<Admin />);

    expect(
      screen.getByRole("heading", { name: "Admin", level: 1 })
    ).toBeInTheDocument();
  });

  it("renders Health Check card section", () => {
    globalThis.fetch = mockFetchSuccess({});
    renderWithQueryClient(<Admin />);

    expect(
      screen.getByRole("heading", { name: "Health Check" })
    ).toBeInTheDocument();
  });

  it("health check button triggers fetch and shows result on success", async () => {
    const healthData = { status: "ok", uptime: 12345 };
    globalThis.fetch = mockFetchSuccess(healthData);
    const user = userEvent.setup();

    renderWithQueryClient(<Admin />);

    await user.click(screen.getByRole("button", { name: "GET /api/health" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/health")
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/"status": "ok"/)).toBeInTheDocument();
    });
    expect(screen.getByText(/"uptime": 12345/)).toBeInTheDocument();
  });

  it("displays error message on fetch failure", async () => {
    globalThis.fetch = mockFetchFailure("Network error");
    const user = userEvent.setup();

    renderWithQueryClient(<Admin />);

    await user.click(screen.getByRole("button", { name: "GET /api/health" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows loading state during fetch", async () => {
    globalThis.fetch = vi.fn(() => new Promise<Response>(() => {}));
    const user = userEvent.setup();

    renderWithQueryClient(<Admin />);

    await user.click(screen.getByRole("button", { name: "GET /api/health" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Loading..." })
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
  });

  it("renders the Advanced Mode checkbox", () => {
    globalThis.fetch = mockFetchSuccess({});
    renderWithQueryClient(<Admin />);

    expect(screen.getByText("Advanced Mode")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("Advanced Mode checkbox defaults to unchecked", () => {
    globalThis.fetch = mockFetchSuccess({});
    renderWithQueryClient(<Admin />);

    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("toggling Advanced Mode checkbox updates localStorage", async () => {
    globalThis.fetch = mockFetchSuccess({});
    const user = userEvent.setup();

    renderWithQueryClient(<Admin />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(localStorage.getItem("advancedMode")).toBe("true");

    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(localStorage.getItem("advancedMode")).toBe("false");
  });

  it("reads Advanced Mode initial state from localStorage", () => {
    globalThis.fetch = mockFetchSuccess({});
    localStorage.setItem("advancedMode", "true");

    renderWithQueryClient(<Admin />);

    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
