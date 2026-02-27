import { Phone, Mail, MessageSquare, Bot, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const stats = [
  {
    label: "Calls handled",
    value: "142",
    change: "+12% this week",
    icon: Phone,
    trend: "up",
  },
  {
    label: "Emails processed",
    value: "1,038",
    change: "+8% this week",
    icon: Mail,
    trend: "up",
  },
  {
    label: "SMS sent",
    value: "317",
    change: "+5% this week",
    icon: MessageSquare,
    trend: "up",
  },
  {
    label: "Agent uptime",
    value: "99.9%",
    change: "Last 30 days",
    icon: TrendingUp,
    trend: "up",
  },
];

const recentActivity = [
  {
    type: "call",
    icon: Phone,
    title: "Inbound call handled",
    detail: "+1 (555) 012-3456 · 3 min 14 s",
    time: "2 min ago",
    status: "resolved",
  },
  {
    type: "email",
    icon: Mail,
    title: "Email reply sent",
    detail: "Re: Invoice #1042 — payment confirmed",
    time: "11 min ago",
    status: "resolved",
  },
  {
    type: "sms",
    icon: MessageSquare,
    title: "SMS conversation",
    detail: "+1 (555) 789-0123 — appointment reminder",
    time: "34 min ago",
    status: "resolved",
  },
  {
    type: "agent",
    icon: Bot,
    title: "Chat session",
    detail: "Web dashboard — 6 messages exchanged",
    time: "1 h ago",
    status: "resolved",
  },
  {
    type: "call",
    icon: Phone,
    title: "Outbound call initiated",
    detail: "+1 (555) 234-5678 · 1 min 52 s",
    time: "2 h ago",
    status: "resolved",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your agent&apos;s activity at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.label}
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest interactions handled by your agent</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentActivity.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={i} className="flex items-start gap-4 py-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {item.detail}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-gray-400 dark:text-gray-600">
                      <Clock className="mr-0.5 inline h-3 w-3" />
                      {item.time}
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      <CheckCircle className="mr-1 h-2.5 w-2.5" />
                      {item.status}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
