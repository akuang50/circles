import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/Status";
import { PersonChip } from "@/components/PersonChip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDayLabel, formatTime, localDateISO } from "@/core/time";
import { hasActiveOptIn } from "@/core/matching";
import type { CampusEvent } from "@/core/types";
import { useApp } from "@/context/AppContext";
import { useBuddy, useEvents, useUserMap } from "@/hooks/useStoreData";

export function EventBuddyScreen() {
  const { store, user } = useApp();
  const events = useEvents(store);
  const [creating, setCreating] = useState(false);

  if (!user) return null;
  if (!events) return <LoadingState label="Loading campus events…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Event buddy</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Not circle-scoped — this is for walking into something campus-wide
            without doing it alone. Opt in privately. A pair or trio only
            appears after at least two people tap the same event.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Close" : "Add an event"}
        </Button>
      </div>

      {creating ? <CreateEventForm onDone={() => setCreating(false)} /> : null}

      {events.length === 0 ? (
        <EmptyState
          title="No events posted"
          body="Add a concert, screening, or market run. People opt in from here — names stay hidden until a match forms."
        />
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateEventForm({ onDone }: { onDone: () => void }) {
  const { store } = useApp();
  const [name, setName] = useState("");
  const [date, setDate] = useState(localDateISO());
  const [startTime, setStartTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await store.createEvent({ name, date, startTime, location, description });
      toast.success("Event posted. Opt-ins stay private.");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-normal">Post an event</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="evt-name">Name</Label>
            <Input id="evt-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Kresge concert" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evt-date">Date</Label>
            <Input id="evt-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evt-time">Start</Label>
            <Input id="evt-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="evt-loc">Meetup landmark</Label>
            <Input
              id="evt-loc"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="North entrance"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="evt-desc">Why someone might want a buddy</Label>
            <Textarea
              id="evt-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <Button type="submit" className="sm:col-span-2" disabled={busy}>
            {busy ? "Posting…" : "Post event"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EventCard({ event }: { event: CampusEvent }) {
  const { store, user } = useApp();
  const payload = useBuddy(store, event.id);
  const people = useUserMap(
    store,
    Array.from(
      new Set([
        ...(payload?.others.map((row) => row.userId) ?? []),
        ...(payload?.match?.userIds ?? []),
      ]),
    ).filter((uid) => uid !== user?.uid),
  );

  if (!payload || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{event.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking your opt-in…</p>
        </CardContent>
      </Card>
    );
  }

  const opted = hasActiveOptIn(payload.mine);

  async function toggle(on: boolean) {
    try {
      const match = await store.setBuddyOptIn(event, on);
      if (match) toast.success(`You're matched. Meet ${match.meetupNote}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update that.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-serif text-2xl font-normal">{event.name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDayLabel(event.date)} · {formatTime(event.startTime)} · {event.location || "Location TBD"}
          </p>
        </div>
        {payload.match ? <Badge>Matched</Badge> : opted ? <Badge variant="secondary">Opted in</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {event.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        ) : null}
        <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-3">
          <div>
            <p className="text-sm font-medium">Going, want a buddy</p>
            <p className="text-xs text-muted-foreground">
              {opted
                ? "Others who opted in can match with you."
                : "Hidden until you opt in too."}
            </p>
          </div>
          <Switch checked={opted} onCheckedChange={toggle} />
        </div>
        {payload.match ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium">Meetup</p>
            <p className="text-sm text-muted-foreground">{payload.match.meetupNote}</p>
            <div className="mt-3 grid gap-2">
              {payload.match.userIds.map((uid) => (
                <PersonChip
                  key={uid}
                  name={uid === user.uid ? "You" : (people[uid]?.name ?? "Your buddy")}
                  hint={uid === user.uid ? "That's you" : "Matched on this event"}
                />
              ))}
            </div>
          </div>
        ) : opted && payload.others.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You're in. Waiting on one more person for this event.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
