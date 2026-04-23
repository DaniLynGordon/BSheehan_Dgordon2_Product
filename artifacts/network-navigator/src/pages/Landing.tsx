import { Link } from "wouter";
import { SignInButton, SignUpButton } from "@clerk/react";
import { Users, Bell, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-foreground">Network Navigator</span>
        </div>
        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <Button variant="ghost" data-testid="button-sign-in" size="sm">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button data-testid="button-sign-up" size="sm">Get started</Button>
          </SignUpButton>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>For early-career professionals</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight tracking-tight">
          Stay in touch with the people<br className="hidden md:block" /> who matter for your career
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          Log networking connections, set gentle follow-up reminders, and see how consistent you really are. Your career relationships, organized.
        </p>
        <div className="flex items-center justify-center gap-3">
          <SignUpButton mode="modal">
            <Button data-testid="button-hero-signup" size="lg" className="gap-2">
              Start for free <ArrowRight className="w-4 h-4" />
            </Button>
          </SignUpButton>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          {
            icon: Users,
            title: "Log connections",
            desc: "Keep a living list of every networking conversation — with notes, context, and history.",
          },
          {
            icon: Bell,
            title: "Set follow-up reminders",
            desc: "Schedule gentle nudges so you never lose momentum with someone important.",
          },
          {
            icon: TrendingUp,
            title: "Track follow-through",
            desc: "See your completion rate over time and celebrate the habit of staying in touch.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-card rounded-2xl border border-card-border p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
