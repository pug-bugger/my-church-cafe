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
import { DrinkForm } from "./DrinkForm";
import { Drink } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

function DrinkManagementSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-[85%] mb-4" />
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DrinkManagement() {
  const drinks = useAppStore((state) => state.drinks);
  const drinksLoading = useAppStore((state) => state.drinksLoading);
  const loadDrinks = useAppStore((state) => state.loadDrinks);
  const deleteDrinkApi = useAppStore((state) => state.deleteDrinkApi);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [drinkToDelete, setDrinkToDelete] = useState<Drink | null>(null);

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
      const message = err instanceof Error ? err.message : "Failed to delete drink";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedDrink(null)}>
              Add New Drink
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Drink</DialogTitle>
              <DialogDescription className="sr-only">
                Fill out the drink details and save.
              </DialogDescription>
            </DialogHeader>
            <DrinkForm drink={selectedDrink} />
          </DialogContent>
        </Dialog>
      </div>

      {drinksLoading ? (
        <DrinkManagementSkeleton />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drinks.map((drink) => (
          <Card key={drink.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <img src={drink.imageUrl} alt={drink.name} />
                </Avatar>
                <div className="min-w-0 flex-1 pr-10">
                  <CardTitle>{drink.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ${drink.price.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${drink.name}`}
                  disabled={deletingId === drink.id}
                  onClick={() => setDrinkToDelete(drink)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {drink.description}
              </p>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Available Options:</h4>
                <ul className="text-sm text-muted-foreground">
                  {drink.availableOptions.map((option) => (
                    <li key={option.id}>
                      {option.name}: {option.values.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 mt-4">
                <Dialog
                  open={editingId === drink.id}
                  onOpenChange={(open) => !open && setEditingId(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditingId(drink.id)}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Edit Drink</DialogTitle>
                      <DialogDescription className="sr-only">
                        Update the drink details and save your changes.
                      </DialogDescription>
                    </DialogHeader>
                    <DrinkForm
                      drink={drink}
                      onSuccess={() => {
                        setEditingId(null);
                        setSelectedDrink(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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

      {!drinksLoading && drinks.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No drinks available. Add your first drink to get started.
        </div>
      )}
    </div>
  );
}
