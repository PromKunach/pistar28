"use client";

import { Sparkles, HelpCircle, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button"

import { buttonVariants } from "@/components/ui/button"
type TopbarProps = {
  onOpenSidebar: () => void;
};

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  return (
    <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
      <button
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>

      <div className="ml-auto flex items-center gap-4 sm:gap-6">
       
         <a href="#" className={buttonVariants({ variant: "secondary", size: "sm" })}>เข้าสู่ระบบ</a>

        <button aria-label="Account">
          <User className="h-5 w-5 text-slate-500" />
        </button>
      </div>
    </header>
  );
}
