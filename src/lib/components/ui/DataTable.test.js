import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DataTable from "./DataTable.svelte";

describe("DataTable search", () => {
  it("debounces a search without creating a reactive update loop", async () => {
    const { getByLabelText, getByText, queryByText } = render(DataTable, {
      props: {
        columns: [{ key: "name", label: "Name" }],
        data: [
          { id: "one", name: "Alpha Person" },
          { id: "two", name: "Beta Person" },
        ],
        searchable: true,
        searchDebounceMs: 5,
      },
    });

    expect(getByText("Alpha Person")).toBeDefined();
    expect(getByText("Beta Person")).toBeDefined();
    await fireEvent.input(getByLabelText("Search table"), { target: { value: "Alpha" } });

    await waitFor(() => {
      expect(getByText("Alpha Person")).toBeDefined();
      expect(queryByText("Beta Person")).toBeNull();
    });
  });
});
