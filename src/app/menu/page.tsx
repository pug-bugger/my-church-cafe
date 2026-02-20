import { MenuList } from "@/components/menu/MenuList";

export default function MenuPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Menu</h1>
        <p className="text-sm text-muted-foreground">
          Browse all currently available products.
        </p>
      </div>
      <MenuList />
    </div>
  );
}
