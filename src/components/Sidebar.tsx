"use client";

import { useState } from "react";
import {
  ChevronDown,
  Home,
  Wrench,
  Info,
  ChevronRight,
  X,
  PanelLeftClose,
  Users,
  Loader,
  CalendarDays,
  Phone,
  Pin,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ContactPanel } from "@/components/ContactPanel";
import { AboutPanel } from "@/components/AboutPanel";

// ---------------------------------------------
// Config — edit this to reshape the nav
// ---------------------------------------------

type SubItem = {
  label: string;
  href: string;
  /** Opens in a new tab. External URLs (http/https) do this automatically. */
  openInNewTab?: boolean;
  /** Opens the contact panel instead of navigating. */
  opensContact?: boolean;
  /** Opens the about panel instead of navigating. */
  opensAbout?: boolean;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href.trim());
}

function isExactNavMatch(pathname: string, href: string) {
  const trimmedHref = href.trim();
  return pathname === trimmedHref;
}

function isNavHrefActive(pathname: string, href: string) {
  const trimmedHref = href.trim();
  if (trimmedHref === "/") return pathname === "/";
  return pathname === trimmedHref || pathname.startsWith(`${trimmedHref}/`);
}

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.children?.length) {
    return item.children.some((child) => isExactNavMatch(pathname, child.href));
  }
  return isNavHrefActive(pathname, item.href);
}

function NavSubLink({
  href,
  label,
  className,
  openInNewTab,
  opensContact,
  opensAbout,
  onOpenContact,
  onOpenAbout,
}: SubItem & {
  className?: string;
  onOpenContact?: () => void;
  onOpenAbout?: () => void;
}) {
  if (opensContact) {
    return (
      <button type="button" onClick={onOpenContact} className={className}>
        {label}
      </button>
    );
  }

  if (opensAbout) {
    return (
      <button type="button" onClick={onOpenAbout} className={className}>
        {label}
      </button>
    );
  }

  const trimmedHref = href.trim();
  const external = isExternalHref(trimmedHref) || openInNewTab;

  if (external) {
    return (
      <a
        href={trimmedHref}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={trimmedHref} className={className}>
      {label}
    </Link>
  );
}

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  expandable?: boolean;
  href: string;
  children?: SubItem[];
  /** Opens the contact panel instead of navigating when the rail is collapsed. */
  opensContact?: boolean;
  /** Opens the about panel instead of navigating when the rail is collapsed. */
  opensAbout?: boolean;
};

const NAV_TOP: NavItem[] = [
  { label: "หน้าหลัก", icon: Home, href: "/" },
  { label: "สมาชิก", icon: Users,expandable:true, href: "/member", children:[{label: "สมาชิกทั้งหมด", href: "/member"},{ label: "ฝ่ายการทำงาน", href: "/member/section" },]},
  { label: "บอร์ดประกาศ", icon: Pin, href: "/announces" },
  { label: "กำหนดการณ์", icon: CalendarDays, href: "/appointment" },
  { label: "ฟีดข่าวสาร", icon: Loader, href: "/news" },
];

const NAV_BUILD: NavItem[] = [
  
  {
    label: "ติดต่อ",
    icon: Phone,
    expandable: true,
    href: "/contacts",
    opensContact: true,
    children: [{ label: "ช่องทางติดต่อ", href: "/contacts", opensContact: true }],
  },
  {
    label: "เกี่ยวกับพวกเรา",
    icon: Info,
    expandable: true,
    href: "/about",
    opensAbout: true,
    children: [{ label: "เกี่ยวกับเรา", href: "/about", opensAbout: true }],
  },
];

const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: NAV_TOP },
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
  const pathname = usePathname();
  // When collapsed on desktop, add lg:hidden to text/labels so they
  // vanish at the lg breakpoint but still show normally on the mobile drawer.
  const labelClass = desktopCollapsed ? "lg:hidden" : "";

  // Tracks which expandable nav items are currently open, by label
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [contactOpen, setContactOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const openContact = () => {
    setAboutOpen(false);
    setContactOpen(true);
    onCloseMobile();
  };

  const openAbout = () => {
    setContactOpen(false);
    setAboutOpen(true);
    onCloseMobile();
  };

  const toggleItem = (label: string) => {
    setOpenItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      <ContactPanel open={contactOpen} onClose={() => setContactOpen(false)} />
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />

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
        <div className="w-[90%] h-[36px] bg-slate-100 text-slate-500 text-sm flex items-center rounded-full shadow-md justify-center mx-auto ring-1 ring-slate-200 mt-4">version : beta 1</div>

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
                  const isActive = isNavItemActive(pathname, item);
                  // Collapsed desktop rail: don't allow expand, behave like a plain link
                  const canExpand = item.expandable && !desktopCollapsed;
                  const navItemClass = isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700 hover:bg-slate-50";

                  return (
                    <li key={item.label}>
                      {canExpand ? (
                        <button
                          type="button"
                          onClick={() => toggleItem(item.label)}
                          className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium ${navItemClass}`}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="flex-1 truncate text-left">{item.label}</span>
                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-200 group-hover:text-slate-400 ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                      ) : item.opensContact || item.opensAbout ? (
                        <button
                          type="button"
                          onClick={item.opensContact ? openContact : openAbout}
                          className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium ${navItemClass} ${
                            desktopCollapsed ? "lg:justify-center" : ""
                          }`}
                          title={desktopCollapsed ? item.label : undefined}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          <span className={`flex-1 truncate text-left ${labelClass}`}>
                            {item.label}
                          </span>
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium ${navItemClass} ${
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
                            {item.children.map((sub) => {
                              const isSubActive = isExactNavMatch(pathname, sub.href);
                              return (
                              <li key={`${sub.label}-${sub.href}`}>
                                <NavSubLink
                                  {...sub}
                                  onOpenContact={openContact}
                                  onOpenAbout={openAbout}
                                  className={`block w-full rounded-md py-1.5 text-left text-sm ${
                                    isSubActive
                                      ? "bg-slate-100 text-slate-900"
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                />
                              </li>
                              );
                            })}
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
