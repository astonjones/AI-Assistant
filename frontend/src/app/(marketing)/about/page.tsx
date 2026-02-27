import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Users, Zap, Heart } from "lucide-react";

const values = [
  {
    icon: Zap,
    title: "Speed to lead",
    description:
      "Every minute a new lead goes unanswered is revenue at risk. CallCleric responds instantly — via call, email, or SMS — so your business is always first to the conversation.",
  },
  {
    icon: Users,
    title: "We understand your workflow",
    description:
      "Our engineers take time to learn how your business actually operates before writing a single line of automation. The result is an agent that fits your process, not the other way around.",
  },
  {
    icon: Heart,
    title: "Honest & transparent",
    description:
      "No dark patterns, no lock-in. We tell you exactly what we’re building, why, and what it costs. Clear expectations from day one.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white dark:bg-gray-950">
      {/* Hero */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4">About us</Badge>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
            We automate the clerical work holding your business back
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            CallCleric was built by software engineers who kept seeing the same problem: businesses losing hours every week to phone tag, inbox overload, and manual scheduling. We built the solution we always wished existed.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-indigo-600 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Bot className="mx-auto mb-4 h-12 w-12 text-indigo-200" />
          <blockquote className="text-2xl font-semibold leading-relaxed text-white">
            &ldquo;Our mission is to give every business the leverage of a full operations team — powered by AI, deployed by engineers who take the time to understand your business.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            What we stand for
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <Card key={v.title}>
                  <CardContent className="pt-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                      {v.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{v.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-gray-50 px-4 py-24 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
            A team of engineers, not just a product
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            CallCleric is built and run by a team of software engineers with deep experience in business automation. We don&apos;t just hand you a dashboard and walk away — we consult on your workflow, build the integration, and stick around to make it work.
          </p>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Whether you need a quick AI layer on top of your existing tools or a fully custom automation pipeline, our engineers can scope it, build it, and maintain it. We speak both business and code.
          </p>
        </div>
      </section>
    </div>
  );
}
