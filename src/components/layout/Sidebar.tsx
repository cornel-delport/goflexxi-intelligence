"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Upload, Calendar, Zap, Users, UserCheck,
  Briefcase, Building2, ClipboardCheck, FolderOpen, ChevronRight, Cloud
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard",         href: "/",                  icon: LayoutDashboard },
  { label: "Upload Data",       href: "/upload",            icon: Upload },
  { label: "Drive Imports",     href: "/drive-imports",     icon: Cloud },
  { divider: true },
  { label: "Opportunities",     href: "/opportunities",     icon: Zap },
  { label: "Events",            href: "/events",            icon: Calendar },
  { divider: true },
  { label: "Supporter Clubs",   href: "/supporter-clubs",   icon: Users },
  { label: "Contacts",          href: "/contacts",          icon: UserCheck },
  { label: "Travel Agents",     href: "/travel-agents",     icon: Briefcase },
  { label: "Club Departments",  href: "/club-departments",  icon: Building2 },
  { divider: true },
  { label: "Data Review",       href: "/data-review",       icon: ClipboardCheck },
  { label: "File Imports",      href: "/file-imports",      icon: FolderOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">GoFlexxi</div>
            <div className="text-xs text-gray-500 leading-tight">Intelligence</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {nav.map((item, i) => {
          if ("divider" in item) {
            return <div key={i} className="my-2 border-t border-gray-100" />;
          }

          const Icon = item.icon;
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-link",
                isActive ? "sidebar-link-active" : "sidebar-link-inactive"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          GoFlexxi Sports Travel Intelligence
        </div>
        <div className="text-xs text-gray-400 mt-0.5">Internal Tool v0.1</div>
      </div>
    </aside>
  );
}
