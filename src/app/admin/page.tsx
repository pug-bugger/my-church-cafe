import { DrinkManagement } from "@/components/admin/DrinkManagement";

export default function AdminPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Drink Management</h1>
      <DrinkManagement />
    </div>
  );
}
