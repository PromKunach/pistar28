"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/userProfile";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useCurrentUser();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-[800px] animate-pulse px-4 py-6">
        <div className="h-8 w-48 rounded bg-slate-100" />
        <div className="mt-4 h-40 rounded-xl bg-slate-100" />
      </div>
    );
  }

  return <>{children}</>;
}
