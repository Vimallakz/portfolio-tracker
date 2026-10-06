"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { selectProfile } from "@/lib/profiles/actions";
import type { ProfileSummary } from "@/lib/profiles/queries";

type ProfileSelectorProps = {
  profiles: ProfileSummary[];
  activeProfile: ProfileSummary | null;
};

export function ProfileSelector({
  profiles,
  activeProfile,
}: ProfileSelectorProps) {
  const [isPending, startTransition] = useTransition();

  if (!activeProfile) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/settings/profile">
          <Plus className="size-4" />
          Create profile
        </Link>
      </Button>
    );
  }

  function handleSelect(profileId: string) {
    if (profileId === activeProfile?.id) {
      return;
    }

    startTransition(async () => {
      const result = await selectProfile(profileId);

      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="gap-2"
        >
          <span className="max-w-32 truncate">{activeProfile.name}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Switch profile</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onSelect={() => handleSelect(profile.id)}
            className="gap-2"
          >
            <span className="truncate">{profile.name}</span>
            {profile.id === activeProfile.id ? (
              <Check className="ml-auto size-4" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="gap-2">
            <Plus className="size-4" />
            Manage profiles
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
