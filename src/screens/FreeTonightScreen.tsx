import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { PersonChip } from "@/components/PersonChip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatTime, localDateISO } from "@/core/time";
import { hasActiveOptIn } from "@/core/matching";
import { useApp } from "@/context/AppContext";
import { useCircle, useFreeTonight, useUserMap } from "@/hooks/useStoreData";

export function FreeTonightScreen() {
  const { circleId = "" } = useParams();
  const { store, user } = useApp();
  const today = localDateISO();
  const circle = useCircle(store, user?.uid, circleId);
  const payload = useFreeTonight(store, circleId, today);
  const users = useUserMap(store, payload?.others.map((row) => row.userId) ?? []);

  if (!user) return null;
  if (circle === undefined || !payload) {
    return <LoadingState label="Checking who's in…" />;
  }
  if (!circle) {
    return <ErrorState title="Circle not found" body="This campus group isn't on your account." />;
  }
  if (!circle.modulesEnabled.includes("free_tonight")) {
    return (
      <ErrorState
        title="Free tonight isn't on"
        body="Turn this module on when you create a campus circle."
      />
    );
  }

  const active = hasActiveOptIn(payload.mine);
  const count = payload.others.length + (active ? 1 : 0);
  const current = circle;

  async function toggle(on: boolean) {
    try {
      await store.setFreeTonight(current.id, today, on);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your signal.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to={`/circles/${circle.id}`} className="hover:underline">
            {circle.name}
          </Link>
          <span className="px-1">/</span>
          Tonight
        </p>
        <h1 className="font-serif text-3xl tracking-tight">Who's free tonight</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          One tap. Your name stays private until someone else in this circle
          taps in too. Expired at the end of the local day — we hide stale
          signals when the app is open, no midnight server job in v1.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-4">
        <div>
          <Label htmlFor="free-toggle" className="text-base">
            I'm free tonight
          </Label>
          <p className="text-sm text-muted-foreground">
            {active
              ? `Visible to others who also opted in · expires ${formatTime("23:59")}`
              : "Off. You won't see anyone, and nobody sees you."}
          </p>
        </div>
        <Switch id="free-toggle" checked={active} onCheckedChange={toggle} />
      </div>

      {!active ? (
        <EmptyState
          title="Opt in to see the room"
          body="Maya could already be free. You wouldn't know yet — that's the point. Flip the switch if you want in."
        />
      ) : payload.others.length === 0 ? (
        <EmptyState
          title="You're in. Nobody else is — yet"
          body="Your signal is live for this circle today. When someone else taps in, they'll show up here and you'll show up for them."
        />
      ) : (
        <div className="space-y-3">
          {count >= 2 ? (
            <Alert>
              <AlertTitle>
                You + {payload.others.length}{" "}
                {payload.others.length === 1 ? "other are" : "others are"} free tonight
              </AlertTitle>
              <AlertDescription>
                That's enough for a low-stakes hang. Text the thread, or just
                pick a hallway. Circles doesn't start a chat for you in v1.
              </AlertDescription>
            </Alert>
          ) : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {payload.others.map((row) => (
              <li key={row.id} className="rounded-xl border bg-card px-3 py-3">
                <PersonChip
                  name={users[row.userId]?.name ?? "Someone free"}
                  hint="Also opted in today"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
