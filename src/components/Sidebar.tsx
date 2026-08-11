"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  Home,
  Wrench,
  Info,
  ChevronRight,
  X,
  PanelLeftClose,
  Users,
  Loader,
  FileText,
  CalendarDays,
  Images,
  Phone,
  Pin,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ---------------------------------------------
// Config — edit this to reshape the nav
// ---------------------------------------------

type SubItem = {
  label: string;
  href: string;
};

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  expandable?: boolean;
  href: string;
  children?: SubItem[]; // sub-links shown when expanded
};

const NAV_TOP: NavItem[] = [
  { label: "หน้าหลัก", icon: Home, href: "/" },
  { label: "สมาชิก", icon: Users,expandable:true, href: "/member", children:[{label: "สมาชิกทั้งหมด", href: "/member"},{ label: "ฝ่ายการทำงาน", href: "/member/section" },]},
  { label: "โน้ตประกาศ", icon: Pin, href: "/announces" },
  { label: "กำหนดการณ์", icon: CalendarDays, href: "/appointment" },
  { label: "ฟีดข่าวสาร", icon: Loader, href: "/news" },
];

const NAV_OBSERVE: NavItem[] = [
  {
    label: "เอกสารต่างๆ",
    icon: FileText,
    expandable: true,
    href: "/files",
    children: [
      { label: "เอกสารทั้งหมด", href: "/files" },
      { label: "อัปโหลดใหม่", href: "/files/upload" },
    ],
  },
  {
    label: "อัลบั้มภาพ",
    icon: Images,
    expandable: true,
    href: "/album",
    children: [
      { label: "อัลบั้มทั้งหมด", href: "/album" },
      { label: "เพิ่มรูปภาพ", href: "/album/upload" },
    ],
  },
];

const NAV_BUILD: NavItem[] = [
  {
    label: "เครื่องมือ",
    icon: Wrench,
    expandable: true,
    href: "/tools",
    children: [{ label: "เครื่องมือทั้งหมด", href: "/tools" }],
  },
  {
    label: "ติดต่อ",
    icon: Phone,
    expandable: true,
    href: "/contacts",
    children: [{ label: "ช่องทางติดต่อ", href: "/contacts" }],
  },
  {
    label: "เกี่ยวกับพวกเรา",
    icon: Info,
    expandable: true,
    href: "/contacts",
    children: [{ label: "เกี่ยวกับเรา", href: "/about" }],
  },
];

const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: NAV_TOP },
  { title: "คลังข้อมูล", items: NAV_OBSERVE },
  { title: "อื่นๆ", items: NAV_BUILD },
];

// ---------------------------------------------
// Component
// ---------------------------------------------

type SidebarProps = {
  mobileOpen: boolean; // mobile drawer open/closed
  onCloseMobile: () => void;
  desktopCollapsed: boolean; // desktop rail collapse (icons only)
  onToggleDesktop: () => void;
};

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
  desktopCollapsed,
  onToggleDesktop,
}: SidebarProps) {
  // When collapsed on desktop, add lg:hidden to text/labels so they
  // vanish at the lg breakpoint but still show normally on the mobile drawer.
  const labelClass = desktopCollapsed ? "lg:hidden" : "";

  // Tracks which expandable nav items are currently open, by label
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (label: string) => {
    setOpenItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Backdrop — mobile only, dims page behind the drawer, click to close */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex h-dvh w-[280px] flex-col border-r border-slate-200 bg-white
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:transition-[width]
          ${desktopCollapsed ? "lg:w-[76px]" : "lg:w-[280px]"}
        `}
      >
        {/* Brand / account switcher */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white">
            <Image src="/logo_img_white.png" alt="logo" width={80} height={80} />
          </div>

          <span className={`truncate text-sm text-slate-800 font-sans ${labelClass}`}>
            version : 1.3.2
          </span>
          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-slate-400 ${labelClass}`} />

          {/* Close button — mobile only */}
          <button
            className="lg:hidden ml-2"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Quick search */}
        <div className="px-3 pt-3">
          <button
            className={`flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 hover:bg-slate-100 ${
              desktopCollapsed ? "lg:justify-center" : ""
            }`}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className={`flex-1 text-left ${labelClass}`}>ค้นหา...</span>
            <kbd
              className={`rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ${labelClass}`}
            >
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Nav sections */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 font-sans no-scrollbar">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className={i === 0 ? "" : "mt-5"}>
              {section.title && (
                <p className={`mb-1 px-2 text-xs uppercase tracking-wide text-slate-400 ${labelClass}`}>
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isOpen = openItems[item.label] ?? false;
                  // Collapsed desktop rail: don't allow expand, behave like a plain link
                  const canExpand = item.expandable && !desktopCollapsed;

                  return (
                    <li key={item.label}>
                      {canExpand ? (
                        <button
                          type="button"
                          onClick={() => toggleItem(item.label)}
                          className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="flex-1 truncate text-left">{item.label}</span>
                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-200 group-hover:text-slate-400 ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${
                            desktopCollapsed ? "lg:justify-center" : ""
                          }`}
                          title={desktopCollapsed ? item.label : undefined}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          <span className={`flex-1 truncate ${labelClass}`}>{item.label}</span>
                          {item.expandable && (
                            <ChevronRight
                              className={`h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-slate-400 ${labelClass}`}
                            />
                          )}
                        </Link>
                      )}

                      {/* Expandable sub-items — animated via grid-template-rows */}
                      {canExpand && item.children && (
                        <div
                          className={`grid transition-all duration-200 ease-in-out ${
                            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <ul className="overflow-hidden pl-9">
                            {item.children.map((sub) => (
                              <li key={sub.href}>
                                <Link
                                  href={sub.href}
                                  className="block py-1.5 text-sm text-slate-500 hover:text-slate-800"
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-slate-100 p-3 lg:block">
          <button
            onClick={onToggleDesktop}
            className="flex w-full items-center  gap-2 rounded-lg px-2.5 py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Toggle sidebar width"
          >
            <PanelLeftClose
              className={`h-4 w-4 transition-transform ${desktopCollapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
