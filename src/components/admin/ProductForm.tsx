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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store";
import { Drink, DrinkOption } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import {
  mapDefinitionToDrinkOption,
  type DrinkOptionDefinitionApi,
} from "@/lib/drinkOptions";
import { CafeIcon } from "@/components/CafeIcon";
import {
  DEFAULT_PRODUCT_IMAGE,
  isDefaultProductImageUrl,
  resolveProductImageUrl,
} from "@/lib/imageUrl";
import {
  ADMIN_CREATABLE_CATEGORIES,
  fetchCategories,
  getDrinkSubtypes,
  isProductCategory,
  PRODUCT_CATEGORY,
  type CategoryRow,
  type ProductCategoryName,
} from "@/lib/productCategories";

interface ProductFormProps {
  product?: Drink | null;
  /** Used when creating a new product (category picker shown). */
  defaultCategory?: ProductCategoryName;
  onSuccess?: () => void;
}

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  subtype: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
});

type FormValues = z.infer<typeof formSchema>;

function idsFromProduct(product: Drink | null | undefined): number[] {
  if (!product?.availableOptions?.length) return [];
  return product.availableOptions
    .map((o) => Number.parseInt(o.id, 10))
    .filter((n) => Number.isFinite(n));
}

function resolveInitialCategory(
  product: Drink | null | undefined,
  defaultCategory?: ProductCategoryName
): ProductCategoryName {
  if (product?.categoryName) {
    const match = ADMIN_CREATABLE_CATEGORIES.find((c) =>
      isProductCategory(product.categoryName, c)
    );
    if (match) return match;
  }
  return defaultCategory ?? PRODUCT_CATEGORY.DRINK;
}

function resolveInitialSubtype(
  product: Drink | null | undefined,
  subtypes: CategoryRow[]
): string {
  if (product?.subtypeName) {
    const match = subtypes.find(
      (s) =>
        s.name.trim().toLowerCase() ===
        product.subtypeName!.trim().toLowerCase()
    );
    if (match) return String(match.id);
  }
  if (product?.categoryId != null) {
    const byId = subtypes.find((s) => s.id === product.categoryId);
    if (byId) return String(byId.id);
  }
  if (subtypes.length) return String(subtypes[0].id);
  return "";
}

export function ProductForm({
  product,
  defaultCategory,
  onSuccess,
}: ProductFormProps) {
  const createDrinkApi = useAppStore((state) => state.createDrinkApi);
  const updateDrinkApi = useAppStore((state) => state.updateDrinkApi);
  const createDessertApi = useAppStore((state) => state.createDessertApi);
  const updateDessertApi = useAppStore((state) => state.updateDessertApi);
  const uploadProductImage = useAppStore((state) => state.uploadProductImage);

  const isEditing = !!product;
  const initialCategory = resolveInitialCategory(product, defaultCategory);

  const [catalog, setCatalog] = useState<DrinkOptionDefinitionApi[]>([]);
  const [drinkSubtypes, setDrinkSubtypes] = useState<CategoryRow[]>([]);
  const [selectedDefIds, setSelectedDefIds] = useState<number[]>(() =>
    idsFromProduct(product)
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: initialCategory,
      subtype: "",
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price != null ? String(product.price) : "",
    },
  });

  const category = form.watch("category") as ProductCategoryName;
  const isDrink = isProductCategory(category, PRODUCT_CATEGORY.DRINK);

  useEffect(() => {
    setSelectedDefIds(idsFromProduct(product));
    form.reset({
      category: resolveInitialCategory(product, defaultCategory),
      subtype: resolveInitialSubtype(product, drinkSubtypes),
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price != null ? String(product.price) : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when product identity changes
  }, [product?.id, defaultCategory, drinkSubtypes]);

  useEffect(() => {
    if (!apiUrl) return;
    fetchCategories(apiUrl)
      .then((rows) => setDrinkSubtypes(getDrinkSubtypes(rows)))
      .catch(() => setDrinkSubtypes([]));
  }, [apiUrl]);

  useEffect(() => {
    if (!isDrink || drinkSubtypes.length === 0) return;
    const current = form.getValues("subtype");
    if (!current) {
      form.setValue(
        "subtype",
        resolveInitialSubtype(product, drinkSubtypes)
      );
    }
  }, [isDrink, drinkSubtypes, product, form]);

  useEffect(() => {
    if (!apiUrl) return;
    apiFetch<DrinkOptionDefinitionApi[]>("/api/drink-options", { auth: false })
      .then((data) => setCatalog(Array.isArray(data) ? data : []))
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

  const displayImageSrc = useMemo(() => {
    if (previewUrl) return previewUrl;
    return resolveProductImageUrl(product?.imageUrl);
  }, [previewUrl, product?.imageUrl]);

  function toggleDefId(id: number) {
    setSelectedDefIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function buildAvailableOptions(): DrinkOption[] {
    const order = new Map(selectedDefIds.map((id, i) => [id, i]));
    return catalog
      .filter((d) => selectedDefIds.includes(d.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map(mapDefinitionToDrinkOption);
  }

  async function onSubmit(values: FormValues) {
    const price = parseFloat(values.price.toString());
    if (Number.isNaN(price)) {
      toast.error("Invalid price");
      return;
    }

    const selectedCategory = values.category as ProductCategoryName;
    const isDrinkCategory = isProductCategory(
      selectedCategory,
      PRODUCT_CATEGORY.DRINK
    );
    if (isDrinkCategory && !values.subtype) {
      toast.error("Select a drink subtype");
      return;
    }
    const subtypeId = values.subtype
      ? Number.parseInt(values.subtype, 10)
      : NaN;
    const subtypeRow = drinkSubtypes.find((s) => s.id === subtypeId);
    const availableOptions = isDrinkCategory ? buildAvailableOptions() : [];

    const payload: Omit<Drink, "id"> = {
      name: values.name,
      description: values.description ?? "",
      price,
      imageUrl: product?.imageUrl ?? DEFAULT_PRODUCT_IMAGE,
      availableOptions,
      categoryName: selectedCategory,
      subtypeName: subtypeRow?.name,
      categoryId: subtypeRow?.id,
    };

    try {
      if (product) {
        if (isProductCategory(selectedCategory, PRODUCT_CATEGORY.DRINK)) {
          await updateDrinkApi(product.id, payload);
        } else if (
          isProductCategory(selectedCategory, PRODUCT_CATEGORY.DESSERT)
        ) {
          await updateDessertApi(product.id, {
            ...payload,
            availableOptions: [],
          });
        } else {
          toast.error("Meal editing is not available yet.");
          return;
        }
        if (imageFile) {
          await uploadProductImage(product.id, imageFile);
          setImageFile(null);
        }
        toast.success("Item updated");
      } else if (isProductCategory(selectedCategory, PRODUCT_CATEGORY.DRINK)) {
        const created = await createDrinkApi(payload);
        if (imageFile) {
          await uploadProductImage(created.id, imageFile);
          setImageFile(null);
        }
        form.reset({
          category: selectedCategory,
          subtype:
            drinkSubtypes.length > 0 ? String(drinkSubtypes[0].id) : "",
          name: "",
          description: "",
          price: "",
        });
        setSelectedDefIds([]);
        toast.success("Drink created");
      } else if (
        isProductCategory(selectedCategory, PRODUCT_CATEGORY.DESSERT)
      ) {
        const created = await createDessertApi({
          ...payload,
          availableOptions: [],
        });
        if (imageFile) {
          await uploadProductImage(created.id, imageFile);
          setImageFile(null);
        }
        form.reset({
          category: selectedCategory,
          name: "",
          description: "",
          price: "",
        });
        toast.success("Dessert created");
      } else {
        toast.error("Meal creation is not available yet.");
        return;
      }
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save menu item";
      toast.error(message);
    }
  }

  const submitLabel = isEditing
    ? "Update item"
    : `Add ${category || "item"}`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ADMIN_CREATABLE_CATEGORIES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing ? (
                <FormDescription className="text-xs">
                  Category cannot be changed when editing.
                </FormDescription>
              ) : null}
            </FormItem>
          )}
        />

        <div className="flex gap-4 items-start">
          <div className="relative h-24 w-24 rounded-md border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {isDefaultProductImageUrl(displayImageSrc) ? (
              <CafeIcon className="h-11 w-11 text-muted-foreground" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImageSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <FormLabel htmlFor="product-image">Photo</FormLabel>
            <Input
              id="product-image"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setImageFile(f ?? null);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, GIF, or WebP · max 5 MB. Saved after you submit the
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

        {isDrink ? (
          <FormField
            control={form.control}
            name="subtype"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Drink subtype</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={drinkSubtypes.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          drinkSubtypes.length
                            ? "Select subtype"
                            : "No subtypes — run DB migration"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {drinkSubtypes.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  e.g. Coffee, Other drinks, Season drinks
                </FormDescription>
              </FormItem>
            )}
          />
        ) : null}

        {isDrink ? (
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
                  <div key={def.id} className="flex items-center space-x-2">
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
        ) : null}

        <Button type="submit" className="w-full">
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
