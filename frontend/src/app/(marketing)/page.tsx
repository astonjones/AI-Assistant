import Link from "next/link";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  CalendarCheck,
  UserCheck,
  Mic,
  Clock,
  ClipboardList,
  Mail,
  Calendar,
  MessageSquare,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const voiceCapabilities = [
  {
    icon: PhoneIncoming,
    title: "Never miss a call",
    description:
      "Your AI agent picks up every inbound call instantly — 24 hours a day, 7 days a week — so no lead or customer ever hits voicemail.",
  },
  {
    icon: CalendarCheck,
    title: "Books appointments automatically",
    description:
      "The agent checks your real-time availability and books directly into your calendar during the call. No back-and-forth, no manual entry.",
  },
  {
    icon: UserCheck,
    title: "Qualifies leads on the spot",
    description:
      "Ask the right questions, score the lead, and route hot prospects straight to your team — all before a human picks up the phone.",
  },
  {
    icon: Mic,
    title: "Sounds natural & on-brand",
    description:
      "Custom voice persona configured to match your business tone. Callers get a professional, human-feeling conversation every time.",
  },
  {
    icon: Clock,
    title: "Handles FAQs without your staff",
    description:
      "Pricing, hours, location, services — the agent answers common questions instantly so your team can focus on higher-value work.",
  },
  {
    icon: ClipboardList,
    title: "Smart call summaries",
    description:
      "After every call, a concise summary is sent to you with the caller's details, intent, and any actions taken — nothing falls through the cracks.",
  },
];

const otherCapabilities = [
  {
    icon: Mail,
    title: "Email automation",
    description: "Inbound emails read, categorised, and replied to automatically.",
  },
  {
    icon: Calendar,
    title: "Calendar management",
    description: "Scheduling, reminders, and conflict resolution — hands-free.",
  },
  {
    icon: MessageSquare,
    title: "SMS & messaging",
    description: "Two-way SMS and instant team notifications via Telegram.",
  },
  {
    icon: BarChart3,
    title: "Analytics dashboard",
    description: "Call volumes, response times, and resolution rates at a glance.",
  },
];

const steps = [
  {
    step: "01",
    title: "We learn your workflow",
    description: "Our team sits down with you to map out where your business spends the most time on repetitive clerical work.",
  },
  {
    step: "02",
    title: "We build and integrate",
    description: "Our engineers connect CallCleric to your existing tools — phone, email, calendar, SMS — and configure the agent around your processes.",
  },
  {
    step: "03",
    title: "You go live",
    description: "We handle the launch, monitor the rollout, and stay hands-on to make sure the system runs smoothly from day one.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white px-4 pb-24 pt-20 dark:bg-gray-950 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-100 opacity-40 blur-3xl dark:bg-indigo-950 dark:opacity-30" />
          <div className="absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-100 opacity-40 blur-3xl dark:bg-violet-950 dark:opacity-30" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6">
            📞 AI Voice Agent — built and managed for your business
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
            Your phones, answered{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              by AI — always
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            CallCleric deploys an AI voice agent that answers calls, books appointments, qualifies leads, and handles FAQs around the clock — so your team can focus on the work that actually grows your business.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/contact">Book a free consultation</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/about">See how it works</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
            No commitment required &middot; Setup handled by our engineers
          </p>
        </div>
      </section>

      {/* ── Voice Agent Spotlight ── */}
      <section id="voice-agent" className="bg-gray-50 px-4 py-24 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <Badge variant="outline" className="mb-4">
              <PhoneCall className="mr-1.5 inline h-3.5 w-3.5" />
              AI Voice Agent
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
              A receptionist that never sleeps
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
              Most businesses lose leads and frustrate customers because calls go unanswered or get buried in voicemail. CallCleric&apos;s voice agent eliminates that problem entirely — handling every call with the same professionalism as your best employee, at any hour.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {voiceCapabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <Card key={cap.title} className="group border-indigo-100 transition-shadow hover:shadow-md dark:border-indigo-900">
                  <CardHeader>
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{cap.title}</CardTitle>
                    <CardDescription>{cap.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="bg-indigo-600 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { icon: Zap,   stat: "< 1s",   label: "Answer time" },
              { icon: Clock, stat: "24 / 7",  label: "Always available" },
              { icon: Phone, stat: "10k+",    label: "Calls handled" },
              { icon: Shield,stat: "99.9%",   label: "Uptime SLA" },
            ].map(({ icon: Icon, stat, label }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <Icon className="mb-2 h-6 w-6 text-indigo-200" />
                <span className="text-3xl font-bold text-white">{stat}</span>
                <span className="mt-1 text-sm text-indigo-200">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white px-4 py-24 dark:bg-gray-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <Badge variant="outline" className="mb-4">How it works</Badge>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
              Up and running in days, not months
            </h2>
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Other capabilities (soft mention) ── */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-4">More capabilities</Badge>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Need more than just voice?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-400">
              Voice is at the core of what we do, but CallCleric can plug into the rest of your workflow too.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {otherCapabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <Card key={cap.title} className="group transition-shadow hover:shadow-sm">
                  <CardHeader>
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold">{cap.title}</CardTitle>
                    <CardDescription className="text-xs">{cap.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-indigo-600 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-white">
            Ready to reclaim your team&apos;s time?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-indigo-200">
            Tell us about your business and we&apos;ll show you exactly where AI automation can make the biggest impact. No sales fluff — just a real conversation.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-white text-indigo-600 hover:bg-indigo-50"
              asChild
            >
              <Link href="/contact">Book a free consultation</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-indigo-400 text-white hover:bg-indigo-700"
              asChild
            >
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
