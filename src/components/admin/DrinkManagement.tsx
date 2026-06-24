"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductForm } from "./ProductForm";
import { DrinkOptionManagement } from "./DrinkOptionManagement";
import { DrinkSubtypeSections } from "@/components/drinks/DrinkSubtypeSections";
import { Drink } from "@/types";
import { toast } from "sonner";
import { Clock, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import {
  productImageClassName,
  resolveProductImageUrl,
} from "@/lib/imageUrl";
import {
  drinkSubtypeLabel,
  groupByDrinkSubtype,
} from "@/lib/drinkSubtypeGroups";
import { useDrinkSubtypeOrder } from "@/hooks/useDrinkSubtypeOrder";

type VisibilityAction = "show" | "hide" | "hide_until_midnight";

function productStatusLabel(drink: Drink): string | null {
  if (drink.active !== false) return null;
  return drink.available_until ? "Hidden until midnight" : "Inactive";
}

function DrinkManagementSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-md shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DrinkCardGrid({
  drinks,
  editingId,
  deletingId,
  togglingId,
  onEdit,
  onDelete,
  onSetVisibility,
}: {
  drinks: Drink[];
  editingId: string | null;
  deletingId: string | null;
  togglingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (drink: Drink) => void;
  onSetVisibility: (drink: Drink, action: VisibilityAction) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {drinks.map((drink) => {
        const statusLabel = productStatusLabel(drink);
        const isHidden = drink.active === false;
        return (
          <Card
            key={drink.id}
            className={`relative transition-opacity ${isHidden ? "opacity-60" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-md border overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveProductImageUrl(drink.imageUrl)}
                    alt=""
                    className={productImageClassName(
                      resolveProductImageUrl(drink.imageUrl)
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1 pr-24">
                  <CardTitle>{drink.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ${drink.price.toFixed(2)}
                  </p>
                  {statusLabel && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {statusLabel}
                    </span>
                  )}
                </div>
                <div className="absolute right-4 top-4 flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Visibility options for ${drink.name}`}
                        disabled={togglingId === drink.id}
                      >
                        {isHidden ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onSetVisibility(drink, "show")}
                        disabled={drink.active !== false}
                      >
                        <Eye className="h-4 w-4" />
                        Show
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onSetVisibility(drink, "hide")}
                        disabled={isHidden && !drink.available_until}
                      >
                        <EyeOff className="h-4 w-4" />
                        Hide
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onSetVisibility(drink, "hide_until_midnight")
                        }
                        disabled={isHidden && !!drink.available_until}
                      >
                        <Clock className="h-4 w-4" />
                        Hide until midnight
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Dialog
                    open={editingId === drink.id}
                    onOpenChange={(open) => !open && onEdit("")}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Edit ${drink.name}`}
                        onClick={() => onEdit(drink.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Edit drink</DialogTitle>
                        <DialogDescription className="sr-only">
                          Update the drink details and save your changes.
                        </DialogDescription>
                      </DialogHeader>
                      <ProductForm
                        product={drink}
                        onSuccess={() => onEdit("")}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${drink.name}`}
                    disabled={deletingId === drink.id}
                    onClick={() => onDelete(drink)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {drink.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function DrinkManagement() {
  const drinks = useAppStore((state) => state.drinks);
  const drinksLoading = useAppStore((state) => state.drinksLoading);
  const loadDrinks = useAppStore((state) => state.loadDrinks);
  const deleteDrinkApi = useAppStore((state) => state.deleteDrinkApi);
  const toggleProductAvailableApi = useAppStore(
    (state) => state.toggleProductAvailableApi
  );
  const subtypeOrder = useDrinkSubtypeOrder();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [drinkToDelete, setDrinkToDelete] = useState<Drink | null>(null);

  const drinkSections = useMemo(
    () => groupByDrinkSubtype(drinks, drinkSubtypeLabel, subtypeOrder),
    [drinks, subtypeOrder]
  );

  useEffect(() => {
    loadDrinks();
  }, [loadDrinks]);

  async function handleDelete(drink: Drink) {
    setDeletingId(drink.id);
    try {
      await deleteDrinkApi(drink.id);
      toast.success(`"${drink.name}" deleted`);
      setDrinkToDelete(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete drink";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetVisibility(drink: Drink, action: VisibilityAction) {
    setTogglingId(drink.id);
    try {
      if (action === "show") {
        await toggleProductAvailableApi(drink.id, true);
        toast.success(`"${drink.name}" is now visible`);
      } else if (action === "hide") {
        await toggleProductAvailableApi(drink.id, false);
        toast.success(`"${drink.name}" is now hidden`);
      } else {
        await toggleProductAvailableApi(drink.id, false, true);
        toast.success(`"${drink.name}" hidden until midnight`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update visibility";
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  }

  function handleEditClose(id: string) {
    setEditingId(id || null);
    if (!id) loadDrinks();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Drinks</h2>
        <p className="text-sm text-muted-foreground">
          Manage drink menu items and reusable drink options.
        </p>
      </div>
      <DrinkOptionManagement />

      {drinksLoading ? (
        <DrinkManagementSkeleton />
      ) : drinks.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No drinks available. Add your first drink to get started.
        </div>
      ) : (
        <DrinkSubtypeSections
          sections={drinkSections}
          renderItems={(sectionDrinks) => (
            <DrinkCardGrid
              drinks={sectionDrinks}
              editingId={editingId}
              deletingId={deletingId}
              togglingId={togglingId}
              onEdit={handleEditClose}
              onDelete={setDrinkToDelete}
              onSetVisibility={handleSetVisibility}
            />
          )}
        />
      )}

      <AlertDialog
        open={!!drinkToDelete}
        onOpenChange={(open) => !open && setDrinkToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete drink</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{drinkToDelete?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!deletingId && drinkToDelete?.id === deletingId}
              onClick={() => drinkToDelete && handleDelete(drinkToDelete)}
            >
              {deletingId && drinkToDelete?.id === deletingId
                ? "Deleting…"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
