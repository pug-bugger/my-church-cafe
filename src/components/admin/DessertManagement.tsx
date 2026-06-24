"use client";

import { useEffect, useState } from "react";
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
import { Drink } from "@/types";
import { toast } from "sonner";
import { Clock, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import {
  productImageClassName,
  resolveProductImageUrl,
} from "@/lib/imageUrl";

type VisibilityAction = "show" | "hide" | "hide_until_midnight";

function productStatusLabel(dessert: Drink): string | null {
  if (dessert.active !== false) return null;
  return dessert.available_until ? "Hidden until midnight" : "Inactive";
}

function DessertManagementSkeleton() {
  return (
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
  );
}

export function DessertManagement() {
  const desserts = useAppStore((state) => state.desserts);
  const dessertsLoading = useAppStore((state) => state.dessertsLoading);
  const loadDesserts = useAppStore((state) => state.loadDesserts);
  const deleteDessertApi = useAppStore((state) => state.deleteDessertApi);
  const toggleProductAvailableApi = useAppStore(
    (state) => state.toggleProductAvailableApi
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dessertToDelete, setDessertToDelete] = useState<Drink | null>(null);

  useEffect(() => {
    loadDesserts();
  }, [loadDesserts]);

  async function handleSetVisibility(
    dessert: Drink,
    action: VisibilityAction
  ) {
    setTogglingId(dessert.id);
    try {
      if (action === "show") {
        await toggleProductAvailableApi(dessert.id, true);
        toast.success(`"${dessert.name}" is now visible`);
      } else if (action === "hide") {
        await toggleProductAvailableApi(dessert.id, false);
        toast.success(`"${dessert.name}" is now hidden`);
      } else {
        await toggleProductAvailableApi(dessert.id, false, true);
        toast.success(`"${dessert.name}" hidden until midnight`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update visibility";
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(dessert: Drink) {
    setDeletingId(dessert.id);
    try {
      await deleteDessertApi(dessert.id);
      toast.success(`"${dessert.name}" deleted`);
      setDessertToDelete(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete dessert";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Desserts</h2>
        <p className="text-sm text-muted-foreground">
          Manage dessert menu items (category: Dessert).
        </p>
      </div>

      {dessertsLoading ? (
        <DessertManagementSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {desserts.map((dessert) => {
            const statusLabel = productStatusLabel(dessert);
            const isHidden = dessert.active === false;
            return (
              <Card
                key={dessert.id}
                className={`relative transition-opacity ${isHidden ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-md border overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveProductImageUrl(dessert.imageUrl)}
                        alt=""
                        className={productImageClassName(
                          resolveProductImageUrl(dessert.imageUrl)
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1 pr-24">
                      <CardTitle>{dessert.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        ${dessert.price.toFixed(2)}
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
                            aria-label={`Visibility options for ${dessert.name}`}
                            disabled={togglingId === dessert.id}
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
                            onClick={() =>
                              handleSetVisibility(dessert, "show")
                            }
                            disabled={dessert.active !== false}
                          >
                            <Eye className="h-4 w-4" />
                            Show
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleSetVisibility(dessert, "hide")
                            }
                            disabled={isHidden && !dessert.available_until}
                          >
                            <EyeOff className="h-4 w-4" />
                            Hide
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleSetVisibility(
                                dessert,
                                "hide_until_midnight"
                              )
                            }
                            disabled={isHidden && !!dessert.available_until}
                          >
                            <Clock className="h-4 w-4" />
                            Hide until midnight
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Dialog
                        open={editingId === dessert.id}
                        onOpenChange={(open) => !open && setEditingId(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label={`Edit ${dessert.name}`}
                            onClick={() => setEditingId(dessert.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Edit dessert</DialogTitle>
                            <DialogDescription className="sr-only">
                              Update the dessert details and save your changes.
                            </DialogDescription>
                          </DialogHeader>
                          <ProductForm
                            product={dessert}
                            onSuccess={() => {
                              setEditingId(null);
                              loadDesserts();
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${dessert.name}`}
                        disabled={deletingId === dessert.id}
                        onClick={() => setDessertToDelete(dessert)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {dessert.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!dessertToDelete}
        onOpenChange={(open) => !open && setDessertToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete dessert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{dessertToDelete?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!deletingId && dessertToDelete?.id === deletingId}
              onClick={() => dessertToDelete && handleDelete(dessertToDelete)}
            >
              {deletingId && dessertToDelete?.id === deletingId
                ? "Deleting…"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!dessertsLoading && desserts.length === 0 && (
        <div className="text-center text-muted-foreground py-8 rounded-lg border border-dashed">
          No desserts yet. Add your first dessert to get started.
        </div>
      )}
    </section>
  );
}
