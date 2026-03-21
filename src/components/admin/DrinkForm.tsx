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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store";
import { Drink, DrinkOption } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  mapDefinitionToDrinkOption,
  type DrinkOptionDefinitionApi,
} from "@/lib/drinkOptions";
import { resolveMediaUrl } from "@/lib/imageUrl";

interface DrinkFormProps {
  drink?: Drink | null;
  onSuccess?: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().min(1, "Price is required"),
});

type FormValues = z.infer<typeof formSchema>;

function idsFromDrink(drink: Drink | null | undefined): number[] {
  if (!drink?.availableOptions?.length) return [];
  return drink.availableOptions
    .map((o) => Number.parseInt(o.id, 10))
    .filter((n) => Number.isFinite(n));
}

export function DrinkForm({ drink, onSuccess }: DrinkFormProps) {
  const createDrinkApi = useAppStore((state) => state.createDrinkApi);
  const updateDrinkApi = useAppStore((state) => state.updateDrinkApi);
  const uploadProductImage = useAppStore((state) => state.uploadProductImage);

  const [catalog, setCatalog] = useState<DrinkOptionDefinitionApi[]>([]);
  const [selectedDefIds, setSelectedDefIds] = useState<number[]>(() =>
    idsFromDrink(drink)
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    setSelectedDefIds(idsFromDrink(drink));
  }, [drink]);

  useEffect(() => {
    if (!apiUrl) return;
    fetch(`${apiUrl}/api/drink-options`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) =>
        setCatalog(Array.isArray(data) ? data : [])
      )
      .catch(() => setCatalog([]));
  }, [apiUrl]);

  useEffect(() => {
    if (!catalog.length) return;
    setSelectedDefIds((prev) =>
      prev.filter((id) => catalog.some((c) => c.id === id))
    );
  }, [catalog]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: drink?.name || "",
      description: drink?.description || "",
      price: drink?.price != null ? String(drink.price) : "",
    },
  });

  const displayImageSrc = useMemo(() => {
    if (previewUrl) return previewUrl;
    return resolveMediaUrl(drink?.imageUrl);
  }, [previewUrl, drink?.imageUrl]);

  function toggleDefId(id: number) {
    setSelectedDefIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function buildAvailableOptions(): DrinkOption[] {
    const order = new Map(selectedDefIds.map((id, i) => [id, i]));
    return catalog
      .filter((d) => selectedDefIds.includes(d.id))
      .sort(
        (a, b) =>
          (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
      )
      .map(mapDefinitionToDrinkOption);
  }

  async function onSubmit(values: FormValues) {
    const price = parseFloat(values.price.toString());
    if (Number.isNaN(price)) {
      toast.error("Invalid price");
      return;
    }
    const availableOptions = buildAvailableOptions();
    try {
      if (drink) {
        await updateDrinkApi(drink.id, {
          name: values.name,
          description: values.description,
          price,
          imageUrl: drink.imageUrl,
          availableOptions,
        });
        if (imageFile) {
          await uploadProductImage(drink.id, imageFile);
          setImageFile(null);
        }
        onSuccess?.();
        toast.success("Drink updated");
      } else {
        const created = await createDrinkApi({
          name: values.name,
          description: values.description,
          price,
          availableOptions,
        });
        if (imageFile) {
          await uploadProductImage(created.id, imageFile);
          setImageFile(null);
        }
        form.reset();
        setSelectedDefIds([]);
        onSuccess?.();
        toast.success("Drink created");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save drink";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-4 items-start">
          <div className="relative h-24 w-24 rounded-md border bg-muted overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <FormLabel htmlFor="drink-image">Photo</FormLabel>
            <Input
              id="drink-image"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setImageFile(f ?? null);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, GIF, or Webp · max 5 MB. Saved after you submit the
              form.
            </p>
          </div>
        </div>

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

        <div className="space-y-3">
          <div>
            <FormLabel>Options for this drink</FormLabel>
            <FormDescription className="text-xs">
              Create reusable options in the catalog above, then tick the ones
              this drink should offer.
            </FormDescription>
          </div>
          {!apiUrl ? (
            <p className="text-sm text-muted-foreground">
              API URL not configured; options cannot be loaded.
            </p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No catalog options yet. Add some in &quot;Reusable drink
              options&quot; first.
            </p>
          ) : (
            <div className="space-y-2 rounded-lg border p-3">
              {catalog.map((def) => (
                <div
                  key={def.id}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`def-${def.id}`}
                    checked={selectedDefIds.includes(def.id)}
                    onCheckedChange={() => toggleDefId(def.id)}
                  />
                  <label
                    htmlFor={`def-${def.id}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {def.name}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      ({def.type === "checkbox" ? "checkbox" : "picklist"}
                      {def.type === "select" && def.values.length
                        ? ` · ${def.values.length} choices`
                        : ""}
                      )
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full">
          {drink ? "Update Drink" : "Add Drink"}
        </Button>
      </form>
    </Form>
  );
}
