import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";

export function LoginScreen() {
  const { store } = useApp();
  const local = store.mode === "local";
  const profiles = local ? store.listLocalProfiles() : [];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function onLocal(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await store.signInLocal(name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function onFirebase(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") await store.signUpEmail(name, email, password);
      else await store.signInEmail(email, password);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Circles</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight">
          Small-group logistics without the public ask.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Signal privately with your house, your class, or a night-out buddy.
          Matches only show up when both sides opted in — nobody gets left on
          read in a group chat.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {local ? (
            <form className="space-y-4" onSubmit={onLocal}>
              <div className="space-y-2">
                <Label htmlFor="name">What should we call you?</Label>
                <Input
                  id="name"
                  autoComplete="nickname"
                  placeholder="Jordan"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Heading in…" : "Continue"}
              </Button>
              {profiles.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground">Already on this device</p>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((profile) => (
                      <Button
                        key={profile.uid}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => store.switchLocalUser(profile.uid).catch((error) => toast.error(error.message))}
                      >
                        {profile.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onFirebase}>
              {mode === "signup" ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    placeholder="Jordan"
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Create one"}
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        {local
          ? "No Firebase project is configured, so this session stays on this browser. Add VITE_FIREBASE_* keys to sync across devices."
          : "Campus circles use join codes in v1 — no school-email gate."}
      </p>
    </div>
  );
}
