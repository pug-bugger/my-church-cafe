"use client";

import { useEffect, useState } from "react";
import {
  defaultDrinkSubtypeOrder,
  fetchDrinkSubtypeOrder,
} from "@/lib/drinkSubtypeGroups";

export function useDrinkSubtypeOrder(): string[] {
  const [order, setOrder] = useState(defaultDrinkSubtypeOrder);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    fetchDrinkSubtypeOrder(apiUrl).then(setOrder).catch(() => {});
  }, []);

  return order;
}
