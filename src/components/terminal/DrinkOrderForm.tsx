"use client";

import { ControllerRenderProps, useForm } from "react-hook-form";
import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
// Dialog is controlled by parent; do not close automatically here
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store";
import { Drink } from "@/types";
import { generateId } from "@/lib/utils";
import { MinusIcon, PlusIcon, CheckCircle2 } from "lucide-react";

interface DrinkOrderFormProps {
  drink: Drink;
  onSuccess?: () => void;
}

const formSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  options: z.record(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export function DrinkOrderForm({ drink, onSuccess }: DrinkOrderFormProps) {
  const addDraftItem = useAppStore((state) => state.addDraftItem);

  const handleQuantityChange = ({
    field,
    type,
  }: {
    field: ControllerRenderProps<FormValues, "quantity">;
    type: "decrement" | "increment";
  }) => {
    const current =
      typeof field.value === "number"
        ? field.value
        : parseInt(String(field.value ?? 1), 10) || 1;
    const next = type === "increment" ? current + 1 : Math.max(1, current - 1);
    field.onChange(next);
  };

  const defaultOptionValues = useMemo(() => {
    const initial: Record<string, string> = {};
    for (const option of drink.availableOptions) {
      if (option.type === "checkbox") {
        const isChecked =
          typeof option.defaultValue === "boolean"
            ? option.defaultValue
            : false;
        initial[option.id] = isChecked ? "true" : "false";
      } else {
        const defaultVal =
          (typeof option.defaultValue === "string" && option.defaultValue) ||
          option.values[0] ||
          "";
        initial[option.id] = defaultVal;
      }
    }
    return initial;
  }, [drink]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      options: defaultOptionValues,
    },
  });

  function onSubmit(values: FormValues) {
    addDraftItem({
      id: generateId(),
      drinkId: drink.id,
      quantity: values.quantity,
      selectedOptions: values.options,
    });
    form.reset();
    onSuccess?.();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 [&_label]:text-base"
      >
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center">
              <FormLabel className="w-full text-center">Quantity</FormLabel>
              <FormControl>
                <div className="flex w-full items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 w-14 shrink-0 rounded-full p-0 [&_svg]:size-7"
                    aria-label="Decrease quantity"
                    onClick={() =>
                      handleQuantityChange({ field, type: "decrement" })
                    }
                  >
                    <MinusIcon />
                  </Button>
                  <Input
                    readOnly
                    tabIndex={-1}
                    aria-readonly
                    {...field}
                    className="pointer-events-none h-14 w-16 shrink-0 select-none rounded-md text-center text-xl font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 w-14 shrink-0 rounded-full p-0 [&_svg]:size-7"
                    aria-label="Increase quantity"
                    onClick={() =>
                      handleQuantityChange({ field, type: "increment" })
                    }
                  >
                    <PlusIcon />
                  </Button>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        {drink.availableOptions.map((option) => (
          <FormField
            key={option.id}
            control={form.control}
            name={`options.${option.id}`}
            render={({ field }) => (
              <FormItem>
                {option.type === "checkbox" ? (
                  <>
                    <FormLabel className="sr-only">{option.name}</FormLabel>
                    <FormControl>
                      <Button
                        type="button"
                        variant={field.value === "true" ? "default" : "outline"}
                        className="h-12 gap-2 rounded-full px-6 text-base [&_svg]:size-5"
                        aria-pressed={field.value === "true"}
                        onClick={() =>
                          field.onChange(
                            field.value === "true" ? "false" : "true"
                          )
                        }
                      >
                        {field.value === "true" && (
                          <CheckCircle2 />
                        )}
                        {option.name}
                      </Button>
                    </FormControl>
                  </>
                ) : (
                  <>
                    <FormLabel>{option.name}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 text-base [&_svg]:size-5">
                          <SelectValue placeholder={`Select ${option.name}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {option.values.map((value) => (
                          <SelectItem
                            key={value}
                            value={value}
                            className="py-3 text-base"
                          >
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </FormItem>
            )}
          />
        ))}

        <Button type="submit" size="lg" className="w-full text-lg">
          Add to Order
        </Button>
      </form>
    </Form>
  );
}
