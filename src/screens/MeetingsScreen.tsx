import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { PersonChip } from "@/components/PersonChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upcomingMeetings } from "@/core/boards";
import { addDaysISO, formatDayLabel, formatTime, localDateISO } from "@/core/time";
import { useApp } from "@/context/AppContext";
import { useCircle, useMeetings, useUserMap } from "@/hooks/useStoreData";

export function MeetingsScreen() {
  const { circleId = "" } = useParams();
  const { store, user } = useApp();
  const circle = useCircle(store, user?.uid, circleId);
  const rows = useMeetings(store, circleId);
  const today = localDateISO();
  const [name, setName] = useState("");
  const [date, setDate] = useState(addDaysISO(today, 1));
  const [startTime, setStartTime] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const upcoming = upcomingMeetings(rows ?? [], today);
  const users = useUserMap(
    store,
    upcoming.map((row) => row.addedBy),
  );

  if (!user) return null;
  if (circle === undefined || !rows) {
    return <LoadingState label="Loading meetings…" />;
  }
  if (!circle) {
    return <ErrorState title="Circle not found" body="This group isn't on your account." />;
  }
  if (!circle.modulesEnabled.includes("meetings")) {
    return (
      <ErrorState
        title="Meetings isn't on"
        body="This module is optional. Turn it on from the circle home if you want a shared list."
      />
    );
  }

  const current = circle;

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await store.addMeeting({
        circleId: current.id,
        name,
        date,
        startTime,
        place,
        note,
      });
      setName("");
      setPlace("");
      setNote("");
      toast.success("Listed. Only people who add something show up here.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await store.removeMeeting(id);
      toast.message("Taken down.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove it.");
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
          Meetings
        </p>
        <h1 className="font-serif text-3xl tracking-tight">Meetings & clubs</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Fully optional. Empty is the normal state — we will not nag you, and
          we do not pull Google Calendar or scrape anything. If you want this
          circle to know about office hours, rehearsal, or a team meeting, add
          it by hand.
        </p>
      </div>

      <form
        onSubmit={onAdd}
        className="space-y-3 rounded-2xl border bg-card px-4 py-4"
      >
        <h2 className="font-medium">Add something if you want</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="mt-name">Name</Label>
            <Input
              id="mt-name"
              placeholder="Chamber rehearsal, office hours, intramural soccer…"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mt-date">Day</Label>
            <Input
              id="mt-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mt-time">Time (optional)</Label>
            <Input
              id="mt-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="mt-place">Place (optional)</Label>
            <Input
              id="mt-place"
              placeholder="26-100, Kresge rehearsal room…"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="mt-note">Note (optional)</Label>
            <Textarea
              id="mt-note"
              placeholder="Bring parts, or skip if you're not going"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? "Adding…" : "List it for this circle"}
        </Button>
      </form>

      {upcoming.length === 0 ? (
        <EmptyState
          title="Nothing listed — that's fine"
          body="This board stays quiet until someone opts in by adding a meeting, club, or office hours. We won't remind you to fill it."
        />
      ) : (
        <ul className="space-y-3">
          {upcoming.map((row) => (
            <li key={row.id} className="space-y-3 rounded-2xl border bg-card px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-serif text-xl">{row.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDayLabel(row.date)}
                    {row.startTime ? ` · ${formatTime(row.startTime)}` : ""}
                    {row.place ? ` · ${row.place}` : ""}
                  </p>
                  {row.note ? (
                    <p className="mt-1 text-sm text-muted-foreground">{row.note}</p>
                  ) : null}
                </div>
                {row.addedBy === user.uid ? (
                  <Button variant="ghost" size="sm" onClick={() => remove(row.id)}>
                    Take down
                  </Button>
                ) : null}
              </div>
              <PersonChip
                name={users[row.addedBy]?.name ?? "A member"}
                hint="Listed this — they opted in by adding it"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
