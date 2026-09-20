import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";

export function JoinCircleScreen() {
  const { store } = useApp();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const circle = await store.joinCircle(code);
      toast.success(`You're in ${circle.name}.`);
      navigate(`/circles/${circle.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Join a circle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask a roommate or classmate for the six-character code. There is no
          school-email check in v1 — the code is the invite.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="join-code">Join code</Label>
              <Input
                id="join-code"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="OAK4US"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className="font-mono tracking-[0.3em]"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Joining…" : "Join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
