"use client";

import { useState } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = {
      firstName: (form.elements.namedItem("first-name") as HTMLInputElement).value,
      lastName: (form.elements.namedItem("last-name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      business: (form.elements.namedItem("business") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white px-4 py-24 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <Badge variant="outline" className="mb-4">Contact</Badge>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white">Let&apos;s talk about your business</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
            Leave your contact info and we&apos;ll reach out to learn about your workflow and show you where AI automation can have the biggest impact.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Info cards */}
          <div className="flex flex-col gap-6">
            {[
              {
                icon: Phone,
                title: "Call or text us",
                detail: "(832) 910-9855",
                sub: "Call or text anytime — we respond fast",
              },
              {
                icon: MessageSquare,
                title: "Free consultation",
                detail: "No commitment required",
                sub: "We&apos;ll assess your workflow and give you a clear picture",
              },
            ].map(({ icon: Icon, title, detail, sub }) => (
              <Card key={title}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{detail}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Form */}
          {sent ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 text-4xl">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Message sent!</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                We&apos;ll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" placeholder="Alex" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" placeholder="Carter" required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="alex@company.com" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" placeholder="(555) 123-4567" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="business">Business name</Label>
                <Input id="business" placeholder="Acme Corp" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">Tell us about your business</Label>
                <Textarea
                  id="message"
                  placeholder="What does your business do? What repetitive tasks take up the most time? Any tools you already use (Gmail, Google Calendar, etc.)?" 
                  rows={5}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Sending…" : "Send — we'll be in touch"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
