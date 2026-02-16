"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profile");
  }, [router]);
  return (
    <div className="container mx-auto py-10 text-center text-muted-foreground">
      Redirecting to profile...
    </div>
  );
}

