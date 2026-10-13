"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole, homeForRole } from "@/lib/api";
import { LoadingState } from "@/components/ui/StateBlock";

// `/app` өөрөө хуудасгүй — 404 биш, эрхийн нүүр рүү шилжүүлнэ.
export default function AppIndex() {
  const router = useRouter();
  useEffect(() => {
    const role = getRole();
    router.replace(role ? homeForRole(role) : "/login");
  }, [router]);
  return <LoadingState />;
}
