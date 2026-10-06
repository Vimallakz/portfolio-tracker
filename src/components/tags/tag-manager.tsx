"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createTag, deleteTag, renameTag } from "@/lib/tags/actions";
import type { TagWithUsage } from "@/lib/tags/queries";

function securityCountLabel(count: number) {
  return `${count} ${count === 1 ? "security" : "securities"}`;
}

function TagRow({ tag }: { tag: TagWithUsage }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [isPending, startTransition] = useTransition();

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await renameTag(tag.id, { name });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Saved successfully");
      setEditing(false);
    });
  }

  function remove() {
    const warning =
      tag.securityCount > 0
        ? `Delete “${tag.name}”? It will be removed from ${securityCountLabel(tag.securityCount)}.`
        : `Delete “${tag.name}”?`;

    if (!window.confirm(warning)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTag(tag.id);

      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  if (editing) {
    return (
      <li className="py-2 first:pt-0 last:pb-0">
        <form onSubmit={save} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label={`Rename ${tag.name}`} maxLength={40} autoFocus />
          <Button type="submit" size="sm" disabled={isPending}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setName(tag.name);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{tag.name}</p>
        <p className="text-muted-foreground text-xs">{securityCountLabel(tag.securityCount)}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} disabled={isPending} aria-label={`Rename ${tag.name}`}>
          <Pencil />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={remove} disabled={isPending} aria-label={`Delete ${tag.name}`}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

export function TagManager({ tags }: { tags: TagWithUsage[] }) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createTag({ name });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setName("");
    });
  }

  return (
    <div className="grid max-w-2xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a tag</CardTitle>
          <CardDescription>
            For example Growth, AI, Dividend, Core or Speculative. Assign tags on each security&apos;s page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tag name"
              aria-label="Tag name"
              maxLength={40}
              disabled={isPending}
            />
            <Button type="submit" size="sm" disabled={isPending || name.trim() === ""}>
              <Plus />
              Add tag
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your tags</CardTitle>
          <CardDescription>
            Filter by tag on the{" "}
            <Link href="/securities" className="underline underline-offset-2">
              Securities
            </Link>{" "}
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tags yet.</p>
          ) : (
            <ul className="divide-y">
              {tags.map((tag) => (
                <TagRow key={`${tag.id}-${tag.name}`} tag={tag} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
