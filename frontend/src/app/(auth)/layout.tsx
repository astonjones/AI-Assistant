import Link from "next/link";
import { Bot } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      {/* Logo link */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Bot className="h-5 w-5 text-white" />
        </div>
        CallCleric
      </Link>

      {children}

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
        © {new Date().getFullYear()} CallCleric. All rights reserved.
      </p>
    </div>
  );
}
