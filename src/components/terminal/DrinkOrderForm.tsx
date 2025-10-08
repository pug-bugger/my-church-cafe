"use client";

import { useForm } from "react-hook-form";
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

  const defaultOptionValues = useMemo(() => {
    const initial: Record<string, string> = {};
    for (const option of drink.availableOptions) {
      initial[option.id] = option.values[0] ?? "";
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
      id: crypto.randomUUID(),
      drinkId: drink.id,
      quantity: values.quantity,
      selectedOptions: values.options,
    });
    form.reset();
    onSuccess?.();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
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
                <FormLabel>{option.name}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${option.name}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {option.values.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        ))}

        <Button type="submit" className="w-full">
          Add to Order
        </Button>
      </form>
    </Form>
  );
}
