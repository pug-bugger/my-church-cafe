"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  useEffect(() => {
    router.replace("/profile");
  }, [router]);
  return (
    <div className="container mx-auto py-10 text-center text-muted-foreground">
      {t("nav.redirectingToProfile")}
    </div>
  );
}

