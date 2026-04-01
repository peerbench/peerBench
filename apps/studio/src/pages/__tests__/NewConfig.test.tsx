import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test/query-helpers";
import { toastError } from "@/lib/toast";
import { api } from "@/lib/api";
import { runnerNames, providerNames, storageNames } from "@/lib/schema-utils";
import { NewConfig } from "../NewConfig";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    createConfig: vi.fn().mockResolvedValue({ id: "test-id" }),
    getEnvVarNames: vi.fn().mockResolvedValue({ names: [] }),
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

function renderNewConfig() {
  return renderWithQueryClient(<NewConfig />);
}

async function selectOption(placeholder: string, optionLabel: string) {
  const placeholderEl = screen.getByText(placeholder);
  await userEvent.click(placeholderEl);

  const escapedLabel = optionLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const option = await screen.findByRole("option", {
    name: new RegExp(escapedLabel),
  });
  await userEvent.click(option);
}

describe("NewConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation", () => {
    it("shows name validation error on submit with empty name", async () => {
      renderNewConfig();

      const submitButton = screen.getByRole("button", {
        name: /create configuration/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledTimes(1);
      });

      const error = vi.mocked(toastError).mock.calls[0][0] as Error;
      expect(error.message).toContain("Name is required");
    });

    it("shows inline error text below name field on failed submit", async () => {
      renderNewConfig();

      const submitButton = screen.getByRole("button", {
        name: /create configuration/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });
    });

    it("clears inline name error after typing a name", async () => {
      renderNewConfig();

      const submitButton = screen.getByRole("button", {
        name: /create configuration/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("My benchmark config");
      await userEvent.type(nameInput, "T");

      await waitFor(() => {
        expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
      });
    });

    it("does not include name error in toast after entering name and resubmitting", async () => {
      renderNewConfig();

      const submitButton = screen.getByRole("button", {
        name: /create configuration/i,
      });

      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(toastError).toHaveBeenCalledTimes(1);
      });

      const firstError = vi.mocked(toastError).mock.calls[0][0] as Error;
      expect(firstError.message).toContain("Name is required");

      const nameInput = screen.getByPlaceholderText("My benchmark config");
      await userEvent.type(nameInput, "Test Config");

      vi.mocked(toastError).mockClear();

      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledTimes(1);
      });

      const secondError = vi.mocked(toastError).mock.calls[0][0] as Error;
      expect(secondError.message).not.toContain("Name is required");
      expect(secondError.message).toContain("Runner is required");
    });

    it("includes all missing required fields in toast error", async () => {
      renderNewConfig();

      const submitButton = screen.getByRole("button", {
        name: /create configuration/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledTimes(1);
      });

      const error = vi.mocked(toastError).mock.calls[0][0] as Error;
      expect(error.message).toContain("Name is required");
      expect(error.message).toContain("Runner is required");
      expect(error.message).toContain("Provider is required");
      expect(error.message).toContain("Storage is required");
    });
  });

  describe("targets", () => {
    it("renders one target by default", () => {
      renderNewConfig();
      expect(screen.getByText("Target 1")).toBeInTheDocument();
      expect(screen.queryByText("Target 2")).not.toBeInTheDocument();
    });

    it("adds a target when clicking Add Target", async () => {
      renderNewConfig();

      const addButton = screen.getByRole("button", { name: /add target/i });
      await userEvent.click(addButton);

      expect(screen.getByText("Target 1")).toBeInTheDocument();
      expect(screen.getByText("Target 2")).toBeInTheDocument();
    });

    it("does not show remove button when there is only one target", () => {
      renderNewConfig();

      const targetSection = screen.getByText("Target 1").closest("div")!;
      const trashButtons = targetSection.querySelectorAll(
        'button [class*="lucide-trash"]'
      );
      expect(trashButtons).toHaveLength(0);
    });

    it("removes a target when clicking its remove button", async () => {
      renderNewConfig();

      const addButton = screen.getByRole("button", { name: /add target/i });
      await userEvent.click(addButton);

      expect(screen.getByText("Target 2")).toBeInTheDocument();

      const target2Label = screen.getByText("Target 2");
      const target2Header = target2Label.closest(
        ".flex.items-center.justify-between"
      )!;
      const removeButton = target2Header.querySelector("button")!;
      await userEvent.click(removeButton);

      expect(screen.queryByText("Target 2")).not.toBeInTheDocument();
    });
  });

  describe("test case sources", () => {
    it("renders one source by default", () => {
      renderNewConfig();
      expect(screen.getByText("Source 1")).toBeInTheDocument();
      expect(screen.queryByText("Source 2")).not.toBeInTheDocument();
    });

    it("adds a source when clicking Add Test Case Source", async () => {
      renderNewConfig();

      const addButton = screen.getByRole("button", {
        name: /add test case source/i,
      });
      await userEvent.click(addButton);

      expect(screen.getByText("Source 1")).toBeInTheDocument();
      expect(screen.getByText("Source 2")).toBeInTheDocument();
    });

    it("removes a source when clicking its remove button", async () => {
      renderNewConfig();

      const addButton = screen.getByRole("button", {
        name: /add test case source/i,
      });
      await userEvent.click(addButton);
      expect(screen.getByText("Source 2")).toBeInTheDocument();

      const source2Label = screen.getByText("Source 2");
      const source2Header = source2Label.closest(
        ".flex.items-center.justify-between"
      )!;
      const removeButton = source2Header.querySelector("button")!;
      await userEvent.click(removeButton);

      expect(screen.queryByText("Source 2")).not.toBeInTheDocument();
    });
  });

  describe("scorer", () => {
    it("does not show scorer type select when scorer is disabled", () => {
      renderNewConfig();
      expect(screen.queryByText("Select a scorer")).not.toBeInTheDocument();
    });

    it("shows scorer type select when scorer is enabled", async () => {
      renderNewConfig();

      const checkbox = screen.getByRole("checkbox", {
        name: /enable scorer/i,
      });
      await userEvent.click(checkbox);

      expect(screen.getByText("Select a scorer")).toBeInTheDocument();
    });

    it("hides scorer type select when scorer is disabled again", async () => {
      renderNewConfig();

      const checkbox = screen.getByRole("checkbox", {
        name: /enable scorer/i,
      });
      await userEvent.click(checkbox);
      expect(screen.getByText("Select a scorer")).toBeInTheDocument();

      await userEvent.click(checkbox);
      expect(screen.queryByText("Select a scorer")).not.toBeInTheDocument();
    });
  });

  describe("advanced settings", () => {
    it("does not show advanced fields by default", () => {
      renderNewConfig();
      expect(
        screen.queryByPlaceholderText('{"key": "value"}')
      ).not.toBeInTheDocument();
    });

    it("shows advanced fields when header is clicked", async () => {
      renderNewConfig();

      const header = screen.getByText("Advanced Settings").closest("div")!;
      await userEvent.click(header);

      expect(
        screen.getByPlaceholderText('{"key": "value"}')
      ).toBeInTheDocument();
    });
  });

  describe("runner selection", () => {
    it("shows runner description and params form after selecting a runner", async () => {
      renderNewConfig();

      await selectOption("Select a runner", runnerNames[0]);

      await waitFor(() => {
        expect(screen.getByText("Runner Parameters")).toBeInTheDocument();
      });
    });

    it("resets runner params when switching runner", async () => {
      renderNewConfig();

      await selectOption("Select a runner", runnerNames[0]);
      await waitFor(() => {
        expect(screen.getByText("Runner Parameters")).toBeInTheDocument();
      });

      // The selected runner name should appear somewhere
      const selectedRunner = runnerNames[0];
      expect(screen.getByText(selectedRunner)).toBeInTheDocument();

      // Select a different runner
      await userEvent.click(screen.getByText(selectedRunner));
      const secondRunner = runnerNames[1];
      const option = await screen.findByRole("option", {
        name: new RegExp(secondRunner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      });
      await userEvent.click(option);

      await waitFor(() => {
        expect(screen.getByText(secondRunner)).toBeInTheDocument();
      });
    });
  });

  describe("JSON preview", () => {
    it("shows runner in JSON preview after selecting one", async () => {
      renderNewConfig();

      await selectOption("Select a runner", runnerNames[0]);

      const preview = screen
        .getByText(/JSON Preview/i)
        .closest("[data-slot='card']")!
        .querySelector("pre")!;

      expect(preview.textContent).toContain(`"runner": "${runnerNames[0]}"`);
    });

    it("shows name in JSON preview after entering one", async () => {
      renderNewConfig();

      // Name does not go into configJson, but description does
      const descInput = screen.getByPlaceholderText(
        "What does this benchmark test?"
      );
      await userEvent.type(descInput, "Test description");

      const preview = screen
        .getByText(/JSON Preview/i)
        .closest("[data-slot='card']")!
        .querySelector("pre")!;

      expect(preview.textContent).toContain(
        '"description": "Test description"'
      );
    });
  });

  describe("form submission", () => {
    it("calls api.createConfig on successful submit", async () => {
      renderNewConfig();

      // Fill name
      const nameInput = screen.getByPlaceholderText("My benchmark config");
      await userEvent.type(nameInput, "My Test Config");

      // Select runner
      await selectOption("Select a runner", runnerNames[0]);

      // Select target provider
      await selectOption("Select provider", providerNames[0]);

      // Select test case storage
      await selectOption("Select storage", storageNames[0]);

      // Submit
      const submitButton = screen.getByRole("button", {
        name: /create configuration/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(api.createConfig).toHaveBeenCalledTimes(1);
      });

      const callArg = vi.mocked(api.createConfig).mock.calls[0][0];
      expect(callArg.name).toBe("My Test Config");
      expect(callArg.configJson).toHaveProperty("runner", runnerNames[0]);
    });

    it("does not call api.createConfig when required fields are missing", async () => {
      renderNewConfig();

      const submitButton = screen.getByRole("button", {
        name: /create configuration/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalled();
      });
      expect(api.createConfig).not.toHaveBeenCalled();
    });
  });
});
