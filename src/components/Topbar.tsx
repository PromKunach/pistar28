"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Menu,
  LogOut,
  UserCircle,
  Settings,
  MessageSquare,
  UserX,
  FileText,
  Folder,
  Images,
  Wrench,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type TopbarProps = {
  onOpenSidebar: () => void;
};

type CachedUser = {
  studentId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

const PFP_COUNT = 32;

function getPfpUrl(index: number) {
  const filename = `pfp_${(index % PFP_COUNT) + 1}.JPG`;
  const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`);
  return data.publicUrl;
}

async function resolveUserProfile(email: string): Promise<CachedUser | null> {
  const studentId = email.split("@")[0]?.trim() ?? "";
  if (!studentId) return null;

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name_th, nickname_th, pbri_id")
    .eq("pbri_id", studentId)
    .maybeSingle();

  if (!profile && /^\d+$/.test(studentId)) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name_th, nickname_th, pbri_id")
      .eq("pbri_id", Number(studentId))
      .maybeSingle();
    profile = data;
  }

  const displayName =
    profile?.nickname_th?.trim() ||
    profile?.full_name_th?.trim() ||
    studentId;

  let avatarUrl: string | undefined;
  if (profile?.id != null) {
    const { data: orderedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .order("id", { ascending: true });

    const index =
      orderedProfiles?.findIndex((row) => String(row.id) === String(profile!.id)) ?? -1;
    avatarUrl = getPfpUrl(index >= 0 ? index : Number(profile.id) - 1);
  }

  const user: CachedUser = { studentId, displayName, email, avatarUrl };

  if (typeof window !== "undefined") {
    localStorage.setItem("pistar_user", JSON.stringify(user));
  }

  return user;
}

function MenuItem({
  href,
  onClick,
  icon: Icon,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn(
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      {children}
    </button>
  );
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<CachedUser | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("pistar_user");
      setUser(null);
      setMenuOpen(false);
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
          setUser(null);
          localStorage.removeItem("pistar_user");
        }
        return;
      }

      try {
        const cached = localStorage.getItem("pistar_user");
        if (cached) {
          const parsed = JSON.parse(cached) as CachedUser;
          if (parsed.email === email && parsed.displayName && !cancelled) {
            setUser(parsed);
          }
        }
      } catch {
        /* ignore bad cache */
      }

      const profile = await resolveUserProfile(email);
      if (!cancelled) setUser(profile);
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

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
      <button
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>

      <div className="relative ml-auto flex items-center gap-3 sm:gap-4" ref={menuRef}>
        {ready && user ? (
          <span className="max-w-[140px] truncate text-sm font-medium text-slate-800 sm:max-w-[220px]">
            {user.displayName}
          </span>
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

        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-full p-1 transition-colors hover:bg-slate-100"
        >
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.displayName}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-slate-500" />
          )}
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            {user ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName}
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {user.displayName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="p-1.5">
                  <MenuItem
                    href="/profile"
                    icon={UserCircle}
                    onClick={() => setMenuOpen(false)}
                  >
                    โปรไฟล์
                  </MenuItem>
                  <MenuItem
                    href="/files"
                    icon={Folder}
                    onClick={() => setMenuOpen(false)}
                  >
                    ไฟล์
                  </MenuItem>
                  <MenuItem
                    href="/tools"
                    icon={Wrench}
                    onClick={() => setMenuOpen(false)}
                  >
                    เครื่องมือ
                  </MenuItem>
                  <MenuItem
                    href="/profile"
                    icon={Settings}
                    onClick={() => setMenuOpen(false)}
                  >
                    ตั้งค่าบัญชี
                  </MenuItem>
                
                </div>

                <div className="border-t border-slate-100 p-1.5">
                  <MenuItem
                    icon={LogOut}
                    onClick={handleSignOut}
                    className="text-red-600 hover:bg-red-50"
                  >
                    {signingOut ? "กำลังออก..." : "Sign out"}
                  </MenuItem>
                </div>
              </>
            ) : (
              <div className="p-1.5">
                <MenuItem
                  href=""
                  icon={UserX}
                >
                  You are our guest :{")"}
                </MenuItem>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
