"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductForm } from "./ProductForm";
import { useAppStore } from "@/store";

export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const loadDrinks = useAppStore((state) => state.loadDrinks);
  const loadDesserts = useAppStore((state) => state.loadDesserts);

  function handleSuccess() {
    loadDrinks();
    loadDesserts();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Add menu item</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add menu item</DialogTitle>
          <DialogDescription>
            Choose a category and fill in the product details.
          </DialogDescription>
        </DialogHeader>
        <ProductForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
