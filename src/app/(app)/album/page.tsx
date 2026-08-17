"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/userProfile";

export default function AlbumPage() {
  const router = useRouter();
  const { user, ready } = useCurrentUser();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login?redirect=/album");
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return null;
  }

  return <div className="p-6">album page content goes here.</div>;
}
