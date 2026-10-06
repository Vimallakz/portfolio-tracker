"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createTag, setSecurityTags } from "@/lib/tags/actions";
import { tagNameSchema, type TagSummary } from "@/lib/tags/schema";
import { cn } from "@/lib/utils";

type SecurityTagsEditorProps = {
  securityId: string;
  assigned: TagSummary[];
  available: TagSummary[];
};

/** Toggling a tag saves immediately; there is no separate save step. */
export function SecurityTagsEditor({ securityId, assigned, available }: SecurityTagsEditorProps) {
  const [selected, setSelected] = useState(() => new Set(assigned.map((tag) => tag.id)));
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function save(next: Set<string>, previous: Set<string>) {
    setSelected(next);

    startTransition(async () => {
      const result = await setSecurityTags(securityId, [...next]);

      if (!result.ok) {
        setSelected(previous);
        toast.error(result.error);
      }
    });
  }

  function toggle(tagId: string) {
    const next = new Set(selected);

    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }

    save(next, selected);
  }

  function addTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = tagNameSchema.safeParse(newName);

    if (!name.success) {
      toast.error(name.error.issues[0]?.message ?? "Enter a tag name.");
      return;
    }

    const existing = available.find((tag) => tag.name.toLowerCase() === name.data.toLowerCase());

    if (existing) {
      setNewName("");

      if (!selected.has(existing.id)) {
        save(new Set(selected).add(existing.id), selected);
      }

      return;
    }

    startTransition(async () => {
      const created = await createTag({ name: name.data });

      if (!created.ok) {
        toast.error(created.error);
        return;
      }

      setNewName("");
      const next = new Set(selected).add(created.tag.id);
      setSelected(next);

      const result = await setSecurityTags(securityId, [...next]);

      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <CardDescription>
          Your own labels for grouping holdings. Manage them in{" "}
          <Link href="/settings/tags" className="underline underline-offset-2">
            Tags
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {available.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tags yet. Create one below, such as Growth or Dividend.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tags">
            {available.map((tag) => {
              const active = selected.has(tag.id);

              return (
                <Button
                  key={tag.id}
                  type="button"
                  size="xs"
                  variant={active ? "secondary" : "outline"}
                  aria-pressed={active}
                  disabled={isPending}
                  onClick={() => toggle(tag.id)}
                  className={cn(!active && "text-muted-foreground")}
                >
                  {active ? <Check /> : null}
                  {tag.name}
                </Button>
              );
            })}
          </div>
        )}

        <form onSubmit={addTag} className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New tag"
            aria-label="New tag name"
            maxLength={40}
            disabled={isPending}
          />
          <Button type="submit" size="sm" variant="outline" disabled={isPending || newName.trim() === ""}>
            <Plus />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
