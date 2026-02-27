import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "$250",
    period: "/month",
    description: "Get an AI voice agent answering your calls 24/7. We set it up and keep it running — no technical effort on your end.",
    highlighted: false,
    features: [
      { label: "AI voice agent — 24/7 inbound call handling", included: true },
      { label: "Custom AI persona configured for your business", included: true },
      { label: "Appointment booking directly into your calendar", included: true },
      { label: "FAQ handling & lead qualification", included: true },
      { label: "Smart call summaries after every call", included: true },
      { label: "Analytics dashboard", included: true },
      { label: "Dedicated setup by our engineers", included: true },
      { label: "Ongoing support & adjustments", included: true },
    ],
  },
  {
    name: "Business",
    price: "$400",
    period: "/month",
    description: "Everything in Starter, plus email and SMS automation to cover more of your workflow.",
    highlighted: true,
    features: [
      { label: "Everything in Starter", included: true },
      { label: "Smart email processing & auto-responses", included: true },
      { label: "SMS messaging & speed-to-lead automation", included: true },
      { label: "Google Calendar sync & scheduling", included: true },
      { label: "Telegram team notifications", included: true },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For larger operations that need multiple agents, deep integrations, or a fully bespoke automation pipeline.",
    highlighted: false,
    features: [
      { label: "Everything in Business", included: true },
      { label: "Multiple AI agents", included: true },
      { label: "Custom integrations with internal systems", included: true },
      { label: "Dedicated account engineer", included: true },
      { label: "SLA-backed uptime guarantee", included: true },
      { label: "Priority 24/7 support", included: true },
      { label: "Workflow consulting sessions", included: true },
      { label: "White-label options", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="bg-white px-4 py-24 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
            Straightforward pricing for real value
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
            We handle the setup and management end-to-end. One flat monthly fee, no hidden costs.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col",
                plan.highlighted &&
                  "border-indigo-600 shadow-lg ring-2 ring-indigo-600 dark:border-indigo-500 dark:ring-indigo-500"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1">Most popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-500 dark:text-gray-400">{plan.period}</span>
                  )}
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-3 text-sm">
                      {f.included ? (
                        <Check className="h-4 w-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <X className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-700" />
                      )}
                      <span
                        className={cn(
                          f.included
                            ? "text-gray-700 dark:text-gray-300"
                            : "text-gray-400 dark:text-gray-600"
                        )}
                      >
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link href="/contact">
                    {plan.name === "Enterprise" ? "Contact us" : "Get started"}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ / note */}
        <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
          All plans start with a free consultation &middot; No long-term contracts &middot;{" "}
          <Link href="/contact" className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
            Questions? Talk to us
          </Link>
        </p>
      </div>
    </div>
  );
}
