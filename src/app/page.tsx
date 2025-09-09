import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-10 text-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              Welcome to Church Cafe
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              A modern order management system for your church cafe. Streamline
              your operations and serve your community better.
            </p>
          </div>
          <div className="space-x-4">
            <Link href="/terminal">
              <Button size="lg">Place Order</Button>
            </Link>
            <Link href="/barista">
              <Button variant="outline" size="lg">
                Barista Station
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
