"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Menu, LogOut } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

type TopbarProps = {
  onOpenSidebar: () => void;
};

type CachedUser = {
  studentId: string;
  displayName: string;
  email: string;
};

async function resolveDisplayName(email: string): Promise<string | null> {
  const studentId = email.split("@")[0]?.trim() ?? "";
  if (!studentId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name_th, nickname_th, pbri_id")
    .eq("pbri_id", studentId)
    .maybeSingle();

  // pbri_id may be stored as number — retry with numeric match if string failed
  let matched = profile;
  if (!matched && /^\d+$/.test(studentId)) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name_th, nickname_th, pbri_id")
      .eq("pbri_id", Number(studentId))
      .maybeSingle();
    matched = data;
  }

  const displayName =
    matched?.nickname_th?.trim() ||
    matched?.full_name_th?.trim() ||
    null;

  if (displayName && typeof window !== "undefined") {
    localStorage.setItem(
      "pistar_user",
      JSON.stringify({ studentId, displayName, email } satisfies CachedUser),
    );
  }

  return displayName;
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("pistar_user");
      setDisplayName(null);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const applyUser = async (email: string | undefined | null) => {
      if (!email) {
        if (!cancelled) {
          setDisplayName(null);
          localStorage.removeItem("pistar_user");
        }
        return;
      }

      // Instant paint from cache, then refresh from profiles
      try {
        const cached = localStorage.getItem("pistar_user");
        if (cached) {
          const parsed = JSON.parse(cached) as CachedUser;
          if (parsed.email === email && parsed.displayName && !cancelled) {
            setDisplayName(parsed.displayName);
          }
        }
      } catch {
        /* ignore bad cache */
      }

      const name = await resolveDisplayName(email);
      if (!cancelled) setDisplayName(name);
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      await applyUser(data.session?.user?.email);
      if (!cancelled) setReady(true);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user?.email);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
      <button
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        {ready && displayName ? (
          <>
            <span className="max-w-[140px] truncate text-sm font-medium text-slate-800 sm:max-w-[220px]">
              {displayName}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              {signingOut ? "กำลังออก..." : "ออกจากระบบ"}
            </Button>
          </>
        ) : ready ? (
          <Link
            href="/login"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            เข้าสู่ระบบ
          </Link>
        ) : (
          <span className="h-8 w-20 animate-pulse rounded-md bg-slate-100" aria-hidden />
        )}

        <button aria-label="Account">
          <User className="h-5 w-5 text-slate-500" />
        </button>
      </div>
    </header>
  );
}
