"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultDrinks } from "@/data/defaultDrinks";
import {
  isProductCategory,
  PRODUCT_CATEGORY,
  type ProductCategoryName,
} from "@/lib/productCategories";

type Product = {
  id: string | number;
  name: string;
  description?: string | null;
  base_price?: number | string | null;
  category_name?: string | null;
  available?: boolean | number | null;
};

const MENU_SECTIONS: { title: string; category: ProductCategoryName }[] = [
  { title: "Drinks", category: PRODUCT_CATEGORY.DRINK },
  { title: "Meals", category: PRODUCT_CATEGORY.MEAL },
  { title: "Desserts", category: PRODUCT_CATEGORY.DESSERT },
];

function isAvailable(value: Product["available"]): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return value === 1;
  return value;
}

function MenuListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={String(product.id)} className="h-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xl font-semibold">
              ${Number(product.base_price ?? 0).toFixed(2)}
            </p>
            {/* <p className="text-sm text-muted-foreground">
              {product.description?.trim() || "No description available."}
            </p> */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MenuList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setProducts(
        defaultDrinks.map((drink) => ({
          id: drink.id,
          name: drink.name,
          description: drink.description,
          base_price: drink.price,
          category_name: PRODUCT_CATEGORY.DRINK,
          available: true,
        })),
      );
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${apiUrl}/api/products`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to load menu");
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid response while loading menu");
        }
        setProducts(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Could not load menu right now.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
    return () => controller.abort();
  }, []);

  const availableProducts = useMemo(
    () => products.filter((product) => isAvailable(product.available)),
    [products],
  );

  const sections = useMemo(() => {
    const grouped = MENU_SECTIONS.map(({ title, category }) => ({
      title,
      items: availableProducts.filter((p) =>
        isProductCategory(p.category_name, category)
      ),
    }));
    const uncategorized = availableProducts.filter(
      (p) =>
        !p.category_name ||
        !MENU_SECTIONS.some(({ category }) =>
          isProductCategory(p.category_name, category)
        )
    );
    if (uncategorized.length) {
      grouped.unshift({
        title: "Other",
        items: uncategorized,
      });
    }
    return grouped.filter((s) => s.items.length > 0);
  }, [availableProducts]);

  if (loading) return <MenuListSkeleton />;

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (availableProducts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products are currently available.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <ProductGrid products={section.items} />
        </section>
      ))}
    </div>
  );
}
