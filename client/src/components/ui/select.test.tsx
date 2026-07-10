import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function TestSelect({
  onValueChange,
}: {
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = React.useState<string>();

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        setValue(nextValue);
        onValueChange?.(nextValue);
      }}
    >
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="pear" disabled>
          Pear
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("opens the option list and reflects the selected value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<TestSelect onValueChange={onValueChange} />);

    const trigger = screen.getByRole("combobox", { name: "Fruit" });

    expect(trigger).toHaveTextContent("Pick a fruit");

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Banana" }));

    expect(onValueChange).toHaveBeenCalledWith("banana");
    expect(trigger).toHaveTextContent("Banana");
    await waitFor(() => {
      expect(
        screen.queryByRole("option", { name: "Banana" }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps disabled items from changing the selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<TestSelect onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox", { name: "Fruit" }));

    const disabledOption = await screen.findByRole("option", { name: "Pear" });

    expect(disabledOption).toHaveAttribute("data-disabled", "");

    await user.click(disabledOption);

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
