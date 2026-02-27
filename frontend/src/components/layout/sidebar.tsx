"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Database,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Agent", href: "/dashboard/agent", icon: Bot },
  { label: "Calls", href: "/dashboard/calls", icon: Phone },
  { label: "Emails", href: "/dashboard/emails", icon: Mail },
  { label: "SMS", href: "/dashboard/sms", icon: MessageSquare },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Database", href: "/dashboard/database", icon: Database },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5 dark:border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-gray-900 dark:text-white">CallCleric</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-gray-600 dark:text-gray-400"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
