import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type TestFormValues = {
  email: string;
};

function TestForm() {
  const form = useForm<TestFormValues>({
    defaultValues: {
      email: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="email"
          rules={{ required: "Email is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input aria-label="Email" {...field} />
              </FormControl>
              <FormDescription>We use this to contact you.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

describe("Form", () => {
  it("connects the control to its description before validation fails", () => {
    render(<TestForm />);

    const input = screen.getByRole("textbox", { name: "Email" });
    const description = screen.getByText("We use this to contact you.");

    expect(input).toHaveAttribute("aria-describedby", description.id);
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("surfaces validation errors through aria metadata and message content", async () => {
    const user = userEvent.setup();

    render(<TestForm />);

    const input = screen.getByRole("textbox", { name: "Email" });
    const label = screen.getByText("Email");
    const description = screen.getByText("We use this to contact you.");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    const message = await screen.findByText("Email is required");
    const describedBy = input.getAttribute("aria-describedby") ?? "";

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(describedBy).toContain(description.id);
    expect(describedBy).toContain(message.id);
    expect(label).toHaveClass("text-destructive");
  });
});
