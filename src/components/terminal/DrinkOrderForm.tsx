"use client";

import { useForm } from "react-hook-form";
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
}

const formSchema = z.object({
  quantity: z.string().transform((val) => parseInt(val, 10)),
  options: z.record(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export function DrinkOrderForm({ drink }: DrinkOrderFormProps) {
  const createOrder = useAppStore((state) => state.createOrder);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      options: {},
    },
  });

  function onSubmit(values: FormValues) {
    createOrder([
      {
        id: crypto.randomUUID(),
        drinkId: drink.id,
        quantity: values.quantity,
        selectedOptions: values.options,
      },
    ]);
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
