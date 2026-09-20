import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { PersonChip } from "@/components/PersonChip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTime } from "@/core/time";
import type { TimeWindow } from "@/core/types";
import { useApp } from "@/context/AppContext";
import { useCircle, useStudy, useUserMap } from "@/hooks/useStoreData";

export function StudyGroupsScreen() {
  const { circleId = "" } = useParams();
  const { store, user } = useApp();
  const circle = useCircle(store, user?.uid, circleId);
  const payload = useStudy(store, circleId);
  const people = useUserMap(
    store,
    Array.from(
      new Set([
        ...(payload?.groups.flatMap((group) => group.memberIds) ?? []),
      ]),
    ),
  );

  const [session, setSession] = useState("Quiz 2 review");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("21:00");
  const [windows, setWindows] = useState<TimeWindow[]>([]);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  if (circle === undefined || !payload) {
    return <LoadingState label="Loading study matches…" />;
  }
  if (!circle) {
    return <ErrorState title="Circle not found" body="This course circle isn't on your account." />;
  }
  if (!circle.modulesEnabled.includes("study_groups")) {
    return (
      <ErrorState
        title="Study groups aren't on"
        body="Enable the study module when you create a campus circle."
      />
    );
  }

  const current = circle;

  function addWindow() {
    if (end <= start) {
      toast.error("End time needs to be after the start.");
      return;
    }
    setWindows((open) => [...open, { start, end }]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const group = await store.submitStudyRequest({
        circleId: current.id,
        targetSession: session,
        availableWindows: windows,
      });
      setWindows([]);
      if (group) toast.success("A study group formed. Only the people in it can see it.");
      else toast.message("Request in. You'll match if someone else's windows overlap.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send that request.");
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
          Study
        </p>
        <h1 className="font-serif text-3xl tracking-tight">Study groups</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Submit what you want to review and when you're free. Other people's
          individual requests stay hidden unless you asked for the same session.
          Groups cap at five.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl font-normal">Request a session</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="session">What are you studying for?</Label>
              <Input
                id="session"
                value={session}
                onChange={(event) => setSession(event.target.value)}
                placeholder="Midterm review"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="win-start">Window start</Label>
                <Input id="win-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="win-end">Window end</Label>
                <Input id="win-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={addWindow}>
                  Add window
                </Button>
              </div>
            </div>
            {windows.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {windows.map((window, index) => (
                  <Badge
                    key={`${window.start}-${index}`}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setWindows((current) => current.filter((_, i) => i !== index))}
                  >
                    {formatTime(window.start)}–{formatTime(window.end)} ×
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Add at least one window you can actually show up for.</p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Submit request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Your matched groups</h2>
        {payload.groups.length === 0 ? (
          <EmptyState
            title="No group yet"
            body="When two or more people request the same session with overlapping windows, a group appears here — not on a public board."
          />
        ) : (
          <div className="grid gap-3">
            {payload.groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{group.sessionLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Overlap:{" "}
                    {group.windows
                      .map((window) => `${formatTime(window.start)}–${formatTime(window.end)}`)
                      .join(", ") || "see the thread"}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.memberIds.map((uid) => (
                      <PersonChip
                        key={uid}
                        name={uid === user.uid ? "You" : (people[uid]?.name ?? "Matched classmate")}
                        hint={uid === user.uid ? "That's you" : "In this group"}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Your open requests</h2>
        {payload.mine.filter((row) => row.status === "open").length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don't have an unmatched request. Submit one above if you want in
            on a session.
          </p>
        ) : (
          <ul className="space-y-2">
            {payload.mine
              .filter((row) => row.status === "open")
              .map((row) => (
                <li key={row.id} className="rounded-xl border bg-card px-4 py-3 text-sm">
                  <p className="font-medium">{row.targetSession}</p>
                  <p className="text-muted-foreground">
                    {row.availableWindows
                      .map((window) => `${formatTime(window.start)}–${formatTime(window.end)}`)
                      .join(", ")}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
