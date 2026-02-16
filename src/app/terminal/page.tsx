import { DrinkList } from "@/components/terminal/DrinkList";
import { CurrentOrder } from "@/components/terminal/CurrentOrder";

export default function TerminalPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DrinkList />
        </div>
        <div className="lg:col-span-1">
          <CurrentOrder />
        </div>
      </div>
    </div>
  );
}
