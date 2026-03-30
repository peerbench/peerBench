import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderWithRouter } from "@/test/render-helpers";
import {
  mockSchemaSetMeta,
  mockBenchmarkMeta,
  resetMockIds,
} from "@/test/api-mocks";
import { Schemas } from "../Schemas";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getBenchmarkMeta: vi.fn().mockResolvedValue({ schemaSets: [] }),
  },
}));

function setupWithSchemas(schemaSets = [
  mockSchemaSetMeta({ name: "FNOL Schema", kind: "llm/fnol", description: "First notice of loss" }),
  mockSchemaSetMeta({ name: "QA Schema", kind: "llm/qa", description: "Question answering" }),
]) {
  vi.mocked(api.getBenchmarkMeta).mockResolvedValue(
    mockBenchmarkMeta({ schemaSets }),
  );
}

describe("Schemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockIds();
  });

  it("shows loading state", () => {
    vi.mocked(api.getBenchmarkMeta).mockReturnValue(new Promise(() => {}));
    renderWithRouter(<Schemas />);

    expect(screen.getByText("Loading schemas...")).toBeInTheDocument();
  });

  it("renders schema cards after load", async () => {
    setupWithSchemas();
    renderWithRouter(<Schemas />);

    await waitFor(() => {
      expect(screen.getByText("FNOL Schema")).toBeInTheDocument();
    });
    expect(screen.getByText("QA Schema")).toBeInTheDocument();
  });

  it("shows empty state when no schemas", async () => {
    vi.mocked(api.getBenchmarkMeta).mockResolvedValue(
      mockBenchmarkMeta({ schemaSets: [] }),
    );
    renderWithRouter(<Schemas />);

    await waitFor(() => {
      expect(screen.getByText("No schemas available.")).toBeInTheDocument();
    });
  });

  it("card shows name, version badge, kind, and description", async () => {
    setupWithSchemas([
      mockSchemaSetMeta({
        name: "Test Schema",
        kind: "llm/test.tc",
        description: "A test schema description",
        version: 3,
      }),
    ]);
    renderWithRouter(<Schemas />);

    await waitFor(() => {
      expect(screen.getByText("Test Schema")).toBeInTheDocument();
    });
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByText("llm/test.tc")).toBeInTheDocument();
    expect(screen.getByText("A test schema description")).toBeInTheDocument();
  });

  it("click expands to show schema sections", async () => {
    const user = userEvent.setup();
    setupWithSchemas([
      mockSchemaSetMeta({
        name: "Expandable Schema",
        testCaseSchema: {
          input: { type: "string", description: "The input text" },
        },
        responseSchema: {
          output: { type: "string", description: "The output text" },
        },
        scoreSchema: {
          accuracy: { type: "number", description: "Accuracy score" },
        },
      }),
    ]);
    renderWithRouter(<Schemas />);

    await waitFor(() => {
      expect(screen.getByText("Expandable Schema")).toBeInTheDocument();
    });

    expect(screen.queryByText("Test Case Schema (Input)")).not.toBeInTheDocument();

    await user.click(screen.getByText("Expandable Schema"));

    expect(screen.getByText("Test Case Schema (Input)")).toBeInTheDocument();
    expect(screen.getByText("Response Schema (Output)")).toBeInTheDocument();
    expect(screen.getByText("Score Schema (Evaluation)")).toBeInTheDocument();
  });

  it("click collapses an expanded card", async () => {
    const user = userEvent.setup();
    setupWithSchemas([
      mockSchemaSetMeta({
        name: "Collapsible Schema",
        testCaseSchema: {
          input: { type: "string", description: "Some field" },
        },
      }),
    ]);
    renderWithRouter(<Schemas />);

    await waitFor(() => {
      expect(screen.getByText("Collapsible Schema")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Collapsible Schema"));
    expect(screen.getByText("Test Case Schema (Input)")).toBeInTheDocument();

    await user.click(screen.getByText("Collapsible Schema"));
    expect(screen.queryByText("Test Case Schema (Input)")).not.toBeInTheDocument();
  });

  it("required fields are marked with 'required' label", async () => {
    const user = userEvent.setup();
    setupWithSchemas([
      mockSchemaSetMeta({
        name: "Required Fields Schema",
        testCaseSchema: {
          mandatoryField: { type: "string", required: true, description: "This is mandatory" },
          optionalField: { type: "number", description: "This is optional" },
        },
      }),
    ]);
    renderWithRouter(<Schemas />);

    await waitFor(() => {
      expect(screen.getByText("Required Fields Schema")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Required Fields Schema"));

    expect(screen.getByText("mandatoryField")).toBeInTheDocument();
    expect(screen.getByText("optionalField")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
  });
});
