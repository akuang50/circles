import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";

export function ProfileScreen() {
  const { store, user } = useApp();
  const [name, setName] = useState(user?.name ?? "");
  const [schoolEmail, setSchoolEmail] = useState(user?.schoolEmail ?? "");
  const [busy, setBusy] = useState(false);
  const profiles = store.mode === "local" ? store.listLocalProfiles() : [];

  if (!user) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await store.updateProfile({ name, schoolEmail });
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">You</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Circles uses your name when a match actually happens. School email is
          optional in v1 — join codes are how campus groups form.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={save}>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">School email (optional)</Label>
              <Input
                id="profile-email"
                type="email"
                value={schoolEmail ?? ""}
                onChange={(event) => setSchoolEmail(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {store.mode === "local" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">People on this browser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Local mode stores everyone in this browser so you can check
              mutual-match privacy: opt in as yourself, then switch to Maya and
              confirm she only sees you after she opts in too.
            </p>
            <div className="flex flex-wrap gap-2">
              {profiles.map((profile) => (
                <Button
                  key={profile.uid}
                  type="button"
                  variant={profile.uid === user.uid ? "default" : "secondary"}
                  size="sm"
                  onClick={() =>
                    store.switchLocalUser(profile.uid).catch((error) => toast.error(error.message))
                  }
                >
                  {profile.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Data mode: {store.mode === "local" ? "local fallback (no Firebase keys)" : "Firebase"}
          </p>
          <Button variant="outline" onClick={() => store.signOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
