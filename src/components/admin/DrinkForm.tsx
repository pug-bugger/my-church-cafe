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
import { useAppStore } from "@/store";
import { Drink, DrinkOption } from "@/types";
import { useState } from "react";
import { generateId } from "@/lib/utils";
import { toast } from "sonner";

interface DrinkFormProps {
  drink?: Drink | null;
  onSuccess?: () => void;
}

const optionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["sugar", "temperature", "size", "custom", "checkbox"]),
  values: z.array(z.string()).min(1, "At least one value is required"),
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().min(1, "Price is required"),
  imageUrl: z
    .string()
    .optional()
    .refine((val) => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be a valid URL"),
  availableOptions: z.array(optionSchema),
});

type FormValues = z.infer<typeof formSchema>;

export function DrinkForm({ drink, onSuccess }: DrinkFormProps) {
  const createDrinkApi = useAppStore((state) => state.createDrinkApi);
  const updateDrinkApi = useAppStore((state) => state.updateDrinkApi);
  const [options, setOptions] = useState<DrinkOption[]>(
    drink?.availableOptions || []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: drink?.name || "",
      description: drink?.description || "",
      price: drink?.price != null ? String(drink.price) : "",
      imageUrl: drink?.imageUrl || "",
      availableOptions: drink?.availableOptions || [],
    },
  });

  async function onSubmit(values: FormValues) {
    const price = parseFloat(values.price.toString());
    const payload = {
      ...values,
      price,
      availableOptions: values.availableOptions,
    };
    try {
      if (drink) {
        await updateDrinkApi(drink.id, {
          name: payload.name,
          description: payload.description,
          price: payload.price,
          imageUrl: payload.imageUrl?.trim() || undefined,
          availableOptions: payload.availableOptions.map((o) => ({
            ...o,
            id: o.id || generateId(),
          })),
        });
        onSuccess?.();
        toast.success("Drink updated");
      } else {
        await createDrinkApi({
          name: payload.name,
          description: payload.description,
          price: payload.price,
          imageUrl: payload.imageUrl?.trim() || undefined,
          availableOptions: payload.availableOptions.map((o) => ({
            ...o,
            id: o.id || generateId(),
          })),
        });
        form.reset();
        onSuccess?.();
        toast.success("Drink created");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save drink";
      toast.error(message);
    }
  }

  const addOption = () => {
    const newOption: DrinkOption = {
      id: generateId(),
      name: "",
      type: "custom",
      values: [""],
    };
    setOptions([...options, newOption]);
  };

  const removeOption = (id: string) => {
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const updateOption = (id: string, field: keyof DrinkOption, value: any) => {
    setOptions(
      options.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Options</h3>
            <Button type="button" variant="outline" onClick={addOption}>
              Add Option
            </Button>
          </div>

          {options.map((option, index) => (
            <div key={option.id} className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Option {index + 1}</h4>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeOption(option.id)}
                >
                  Remove
                </Button>
              </div>

              <FormField
                control={form.control}
                name={`availableOptions.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) =>
                          updateOption(option.id, "name", e.target.value)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`availableOptions.${index}.type`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select
                        className="w-full p-2 border rounded-md"
                        {...field}
                        onChange={(e) =>
                          updateOption(option.id, "type", e.target.value)
                        }
                      >
                        <option value="sugar">Sugar</option>
                        <option value="temperature">Temperature</option>
                        <option value="size">Size</option>
                        <option value="custom">Custom</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`availableOptions.${index}.values`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Values (comma-separated)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={option.values.join(", ")}
                        onChange={(e) =>
                          updateOption(
                            option.id,
                            "values",
                            e.target.value.split(",").map((v) => v.trim())
                          )
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full">
          {drink ? "Update Drink" : "Add Drink"}
        </Button>
      </form>
    </Form>
  );
}
