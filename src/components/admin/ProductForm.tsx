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
  categoryName as categoryLabelSingular,
  subtypeLabel,
  t as translate,
  useTranslation,
} from "@/i18n";
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

/**
 * Built lazily so the messages are read in the language on screen: a schema
 * evaluated at module load would freeze whichever language was active when the
 * bundle was first touched.
 */
const buildFormSchema = () =>
  z.object({
    category: z.string().min(1, translate("manage.productForm.categoryRequired")),
    subtype: z.string().optional(),
    name: z.string().min(1, translate("manage.productForm.nameRequired")),
    description: z.string().optional(),
    price: z.string().min(1, translate("manage.productForm.priceRequired")),
  });

const formSchema = buildFormSchema();

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
  const { t } = useTranslation();
  const createProductApi = useAppStore((state) => state.createProductApi);
  const updateProductApi = useAppStore((state) => state.updateProductApi);
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
    resolver: zodResolver(buildFormSchema()),
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
    // `force`: the module-scope cache can predate a category migration, and a
    // stale list makes saving into a newly seeded category fail.
    fetchCategories(apiUrl, true)
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
      toast.error(t("manage.productForm.invalidPrice"));
      return;
    }

    const selectedCategory = values.category as ProductCategoryName;
    const isDrinkCategory = isProductCategory(
      selectedCategory,
      PRODUCT_CATEGORY.DRINK
    );
    if (isDrinkCategory && !values.subtype) {
      toast.error(t("manage.productForm.selectSubtypeFirst"));
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

    // One path for every category. Drink, Dessert, Meal and Other differ only in
    // which `categories` row they resolve to, which the store works out.
    try {
      if (product) {
        await updateProductApi(product.id, payload);
        if (imageFile) {
          await uploadProductImage(product.id, imageFile);
          setImageFile(null);
        }
        toast.success(t("manage.productForm.itemUpdated"));
      } else {
        const created = await createProductApi(payload);
        if (imageFile) {
          await uploadProductImage(created.id, imageFile);
          setImageFile(null);
        }
        form.reset({
          category: selectedCategory,
          subtype:
            isDrinkCategory && drinkSubtypes.length > 0
              ? String(drinkSubtypes[0].id)
              : "",
          name: "",
          description: "",
          price: "",
        });
        setSelectedDefIds([]);
        toast.success(
          t("manage.productForm.itemCreated", {
            category: categoryLabelSingular(selectedCategory, t),
          })
        );
      }
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("manage.productForm.saveFailed");
      toast.error(message);
    }
  }

  const submitLabel = isEditing
    ? t("manage.productForm.updateItem")
    : category
      ? t("manage.productForm.addCategory", {
          category: categoryLabelSingular(category, t),
        })
      : t("manage.productForm.addItem");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("manage.productForm.category")}</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("manage.productForm.selectCategory")}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ADMIN_CREATABLE_CATEGORIES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {categoryLabelSingular(name, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing ? (
                <FormDescription className="text-xs">
                  {t("manage.productForm.categoryLocked")}
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
            <FormLabel htmlFor="product-image">
              {t("manage.productForm.photo")}
            </FormLabel>
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
              {t("manage.productForm.photoHint")}
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("common.name")}</FormLabel>
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
              <FormLabel>{t("common.description")}</FormLabel>
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
              <FormLabel>{t("common.price")}</FormLabel>
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
                <FormLabel>{t("manage.productForm.drinkSubtype")}</FormLabel>
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
                            ? t("manage.productForm.selectSubtype")
                            : t("manage.productForm.noSubtypes")
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {drinkSubtypes.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {subtypeLabel(st.name, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {t("manage.productForm.subtypeHint")}
                </FormDescription>
              </FormItem>
            )}
          />
        ) : null}

        {isDrink ? (
          <div className="space-y-3">
            <div>
              <FormLabel>
                {t("manage.productForm.optionsForDrink")}
              </FormLabel>
              <FormDescription className="text-xs">
                {t("manage.productForm.optionsHint")}
              </FormDescription>
            </div>
            {!apiUrl ? (
              <p className="text-sm text-muted-foreground">
                {t("manage.productForm.optionsUnavailable")}
              </p>
            ) : catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("manage.productForm.noCatalogOptions")}
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
                        (
                        {def.type === "checkbox"
                          ? t("manage.productForm.typeCheckbox")
                          : t("manage.productForm.typePicklist")}
                        {def.type === "select" && def.values.length
                          ? ` · ${t("manage.productForm.choiceCount", {
                              count: def.values.length,
                            })}`
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
