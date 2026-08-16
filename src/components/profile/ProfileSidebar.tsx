"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  LogOut,
  Menu,
  Palette,
  Shield,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { CurrentUser } from "@/lib/userProfile";
import { cn } from "@/lib/utils";
import { ProfileSectionProvider, useProfileSection, type ProfileSection } from "./ProfileSectionContext";
import { useCurrentUser } from "@/lib/userProfile";

const NAV_ITEMS: {
  id: ProfileSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "customize", label: "ปรับแต่งการ์ด", icon: Palette },
  { id: "privacy", label: "ความเป็นส่วนตัว", icon: Shield },
  { id: "account", label: "บัญชี", icon: User },
];

function ProfileSidebarInner({ user }: { user: CurrentUser | null }) {
  const router = useRouter();
  const { section, setSection, mobileOpen, setMobileOpen } = useProfileSection();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem("pistar_user");
    router.replace("/login");
  }

  function selectSection(next: ProfileSection) {
    setSection(next);
    setMobileOpen(false);
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="ปิดเมนู"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-dvh w-[240px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <User className="h-5 w-5 text-slate-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {user?.displayName ?? "—"}
            </p>
            <p className="truncate text-xs text-slate-500">{user?.studentId ?? ""}</p>
          </div>
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="ปิดเมนู"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-100 p-3">
          <Link
            href="/"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Home className="h-[18px] w-[18px] shrink-0" />
            กลับหน้าหลัก
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {signingOut ? "กำลังออก..." : "ออกจากระบบ"}
          </button>
        </div>
      </aside>
    </>
  );
}

function ProfileLayoutShell({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const { setMobileOpen } = useProfileSection();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-slate-900">
      <ProfileSidebarInner user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center border-b border-slate-100 px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="เปิดเมนู"
            className="rounded-lg p-1.5 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </button>
          <span className="ml-3 text-sm font-medium">โปรไฟล์</span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileSectionProvider>
      <ProfileLayoutShell>{children}</ProfileLayoutShell>
    </ProfileSectionProvider>
  );
}

export { type ProfileSection } from "./ProfileSectionContext";
