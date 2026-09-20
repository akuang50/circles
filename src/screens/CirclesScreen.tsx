import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/Status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULE_COPY } from "@/core/copy";
import type { ModuleId } from "@/core/types";
import { useApp } from "@/context/AppContext";
import { useCircles } from "@/hooks/useStoreData";

export function CirclesScreen() {
  const { store, user } = useApp();
  const navigate = useNavigate();
  const circles = useCircles(store, user?.uid);
  const [seeding, setSeeding] = useState(false);

  if (!user) return null;
  if (!circles) return <LoadingState label="Loading your circles…" />;

  async function seed() {
    setSeeding(true);
    try {
      await store.seedDemo();
      toast.success("Oak Street house and 6.006 recitation are ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the demo.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Your circles</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A circle is a small, bounded group — roommates, a recitation, a
            lab section. Modules turn on only for the groups that need them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/join">Join with a code</Link>
          </Button>
          <Button asChild>
            <Link to="/new">Create a circle</Link>
          </Button>
        </div>
      </div>

      {circles.length === 0 ? (
        <EmptyState
          title="You're not in a circle yet"
          body="Create one for your house, or join with a six-character code someone shared. Event buddy matching lives on the Events tab and doesn't need a circle."
          action={
            store.mode === "local" ? (
              <Button variant="outline" onClick={seed} disabled={seeding}>
                {seeding ? "Setting up…" : "Load the Oak Street demo"}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {circles.map((circle) => (
            <button
              key={circle.id}
              type="button"
              className="text-left"
              onClick={() => navigate(`/circles/${circle.id}`)}
            >
              <Card className="h-full transition hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="font-serif text-2xl font-normal">
                      {circle.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {circle.type === "household" ? "Household" : "Campus"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {circle.memberIds.length}{" "}
                    {circle.memberIds.length === 1 ? "member" : "members"} · join code{" "}
                    <span className="font-mono tracking-wider">{circle.joinCode}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {circle.modulesEnabled.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No modules on</span>
                    ) : (
                      circle.modulesEnabled.map((moduleId) => (
                        <Badge key={moduleId} variant="outline">
                          {MODULE_COPY[moduleId as ModuleId]?.label ?? moduleId}
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
