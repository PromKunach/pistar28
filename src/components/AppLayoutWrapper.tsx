"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { cn } from "@/lib/utils";
const NO_LAYOUT_ROUTES = ["/login", "/onboarding"];
export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer
  const [desktopCollapsed, setDesktopCollapsed] = useState(false); // desktop rail collapse
  if (NO_LAYOUT_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-slate-900">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        desktopCollapsed={desktopCollapsed}
        onToggleDesktop={() => setDesktopCollapsed((c) => !c)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            pathname === "/appointment" && "no-scrollbar"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
