import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { PersonChip } from "@/components/PersonChip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NOTICE_TAG_COPY } from "@/core/copy";
import { sortNoticesNewest } from "@/core/boards";
import type { NoticeTag } from "@/core/types";
import { NOTICE_TAGS } from "@/core/types";
import { useApp } from "@/context/AppContext";
import { useCircle, useNotices, useUserMap } from "@/hooks/useStoreData";

export function NoticesScreen() {
  const { circleId = "" } = useParams();
  const { store, user } = useApp();
  const circle = useCircle(store, user?.uid, circleId);
  const rows = useNotices(store, circleId);
  const [body, setBody] = useState("");
  const [where, setWhere] = useState("");
  const [tag, setTag] = useState<NoticeTag>("other");
  const [busy, setBusy] = useState(false);
  const notices = sortNoticesNewest(rows ?? []);
  const users = useUserMap(
    store,
    notices.map((row) => row.postedBy),
  );

  if (!user) return null;
  if (circle === undefined || !rows) {
    return <LoadingState label="Loading sightings…" />;
  }
  if (!circle) {
    return <ErrorState title="Circle not found" body="This group isn't on your account." />;
  }
  if (!circle.modulesEnabled.includes("notices")) {
    return (
      <ErrorState
        title="Sightings isn't on"
        body="Turn this on from the circle home. Posts stay inside this circle — not a public feed."
      />
    );
  }

  const current = circle;

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await store.addNotice({
        circleId: current.id,
        body,
        where,
        tag,
      });
      setBody("");
      setWhere("");
      toast.success("Posted to this circle only.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post that.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await store.removeNotice(id);
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
          Sightings
        </p>
        <h1 className="font-serif text-3xl tracking-tight">What people saw</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Optional. If the bathroom is filthy or someone spotted mice, post it
          here for this circle — dorm, household, or campus group. Your name is
          on the post (these are small trusted groups; no anonymous v1). Newest
          first. Not a public internet feed.
        </p>
      </div>

      <form
        onSubmit={onAdd}
        className="space-y-3 rounded-2xl border bg-card px-4 py-4"
      >
        <h2 className="font-medium">Post a sighting</h2>
        <div className="space-y-1">
          <Label htmlFor="nt-body">What happened</Label>
          <Textarea
            id="nt-body"
            placeholder="The bathroom is really dirty, or mice sighting by the stove…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="nt-where">Where (optional)</Label>
            <Input
              id="nt-where"
              placeholder="3rd floor bathroom, kitchen…"
              value={where}
              onChange={(event) => setWhere(event.target.value)}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tag</legend>
            <div className="flex flex-wrap gap-2">
              {NOTICE_TAGS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={tag === option ? "default" : "outline"}
                  onClick={() => setTag(option)}
                >
                  {NOTICE_TAG_COPY[option]}
                </Button>
              ))}
            </div>
          </fieldset>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Posting…" : "Post to this circle"}
        </Button>
      </form>

      {notices.length === 0 ? (
        <EmptyState
          title="No sightings posted"
          body="Empty is fine. If you see a mess, a pest, or something broken, you can write it here. It stays with this circle's members."
        />
      ) : (
        <ul className="space-y-3">
          {notices.map((row) => (
            <li key={row.id} className="space-y-3 rounded-2xl border bg-card px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={row.tag === "pest" ? "destructive" : "secondary"}>
                  {NOTICE_TAG_COPY[row.tag]}
                </Badge>
                {row.where ? (
                  <span className="text-xs text-muted-foreground">{row.where}</span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed">{row.body}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <PersonChip
                  name={users[row.postedBy]?.name ?? "A member"}
                  hint={new Date(row.createdAt).toLocaleString(undefined, {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                />
                {row.postedBy === user.uid ? (
                  <Button variant="ghost" size="sm" onClick={() => remove(row.id)}>
                    Take down
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
