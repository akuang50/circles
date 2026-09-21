import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { PersonChip } from "@/components/PersonChip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PLACE_COPY,
  PRESENCE_EXPIRY_COPY,
} from "@/core/copy";
import {
  activeCheckIns,
  groupCheckInsByPlace,
  presetPlaceLabel,
} from "@/core/boards";
import { formatExpiry } from "@/core/time";
import type { PlaceKind, PlacePreset, PresenceExpiryOption } from "@/core/types";
import { PLACE_PRESETS } from "@/core/types";
import { useApp } from "@/context/AppContext";
import { useCircle, usePresence, useUserMap } from "@/hooks/useStoreData";

export function PresenceScreen() {
  const { circleId = "" } = useParams();
  const { store, user } = useApp();
  const circle = useCircle(store, user?.uid, circleId);
  const rows = usePresence(store, circleId);
  const [custom, setCustom] = useState("");
  const [expiry, setExpiry] = useState<PresenceExpiryOption>("2h");
  const [busy, setBusy] = useState(false);
  const active = activeCheckIns(rows ?? []);
  const users = useUserMap(
    store,
    active.map((row) => row.userId),
  );

  if (!user) return null;
  if (circle === undefined || !rows) {
    return <LoadingState label="Checking named places…" />;
  }
  if (!circle) {
    return (
      <ErrorState
        title="Circle not found"
        body="This group isn't on your account."
      />
    );
  }
  if (!circle.modulesEnabled.includes("presence")) {
    return (
      <ErrorState
        title="Who's where isn't on"
        body="Turn on this module from the circle home. It stays off until someone opts the circle in."
      />
    );
  }

  const mine = active.find((row) => row.userId === user.uid) ?? null;
  const groups = groupCheckInsByPlace(active);
  const household = circle.type === "household";
  const current = circle;

  async function checkIn(placeKind: PlaceKind, placeLabel: string) {
    setBusy(true);
    try {
      await store.setPresenceCheckIn({
        circleId: current.id,
        placeKind,
        placeLabel,
        expiry,
      });
      toast.success(`Checked in at ${placeLabel}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check in.");
    } finally {
      setBusy(false);
    }
  }

  async function onCustom(event: FormEvent) {
    event.preventDefault();
    const label = custom.trim();
    if (!label) {
      toast.error("Name the place — we don't use GPS.");
      return;
    }
    await checkIn("custom", label);
    setCustom("");
  }

  async function clear() {
    setBusy(true);
    try {
      await store.clearPresenceCheckIn(current.id);
      toast.message("Check-in cleared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear it.");
    } finally {
      setBusy(false);
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
          Who's where
        </p>
        <h1 className="font-serif text-3xl tracking-tight">Who's where</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {household
            ? "You already share this house. Checking in just names a place — home, the common room, out — so nobody has to text. We never ask for location permission, and there is no map of live coordinates."
            : "This is a check-in you choose, not stalking. Only this circle sees it, and it expires. We never request GPS and we never plot live coordinates."}
        </p>
      </div>

      <Alert>
        <AlertTitle>Opt-in, named places only</AlertTitle>
        <AlertDescription>
          Tap a label when you want this circle to know. Nothing is tracked in
          the background. Expired check-ins hide when someone opens the app.
        </AlertDescription>
      </Alert>

      <section className="space-y-3 rounded-2xl border bg-card px-4 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-medium">Your check-in</h2>
            <p className="text-sm text-muted-foreground">
              {mine
                ? `${mine.placeLabel} · ${formatExpiry(mine.expiresAt)}`
                : "You're not checked in. This circle won't see a place for you."}
            </p>
          </div>
          {mine ? (
            <Button variant="outline" onClick={clear} disabled={busy}>
              Clear it
            </Button>
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">How long it stays up</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRESENCE_EXPIRY_COPY) as PresenceExpiryOption[]).map(
              (option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={expiry === option ? "default" : "outline"}
                  onClick={() => setExpiry(option)}
                >
                  {PRESENCE_EXPIRY_COPY[option]}
                </Button>
              ),
            )}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLACE_PRESETS.map((place) => (
            <Button
              key={place}
              type="button"
              variant={mine?.placeKind === place ? "default" : "secondary"}
              disabled={busy}
              onClick={() => checkIn(place, presetPlaceLabel(place as PlacePreset))}
            >
              {PLACE_COPY[place]}
            </Button>
          ))}
        </div>

        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onCustom}>
          <div className="flex-1 space-y-1">
            <Label htmlFor="custom-place">Custom label</Label>
            <Input
              id="custom-place"
              placeholder="Hayden stacks, lab 4-401…"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
            />
          </div>
          <Button type="submit" className="sm:mt-6" disabled={busy} variant="secondary">
            Check in there
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">In this circle</h2>
        {groups.length === 0 ? (
          <EmptyState
            title="Nobody is checked in"
            body="When someone taps a place, they'll show up here grouped by that label. Until then the board stays empty — that's the point of opt-in."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.key} className="space-y-3 rounded-2xl border bg-card px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">{group.placeLabel}</h3>
                  <Badge variant="secondary">{group.people.length}</Badge>
                </div>
                <ul className="space-y-2">
                  {group.people.map((row) => (
                    <li key={row.id}>
                      <PersonChip
                        name={users[row.userId]?.name ?? "Someone in the circle"}
                        hint={formatExpiry(row.expiresAt)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
