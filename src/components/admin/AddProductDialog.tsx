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
import { useTranslation } from "@/i18n";
import { useAppStore } from "@/store";

export function AddProductDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const loadProducts = useAppStore((state) => state.loadProducts);

  function handleSuccess() {
    loadProducts();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          {t("manage.product.addMenuItem")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("manage.product.addMenuItem")}</DialogTitle>
          <DialogDescription>
            {t("manage.product.addDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <ProductForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
