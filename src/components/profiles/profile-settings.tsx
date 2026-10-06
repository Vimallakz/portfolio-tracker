"use client";

import { ProfileForm } from "@/components/profiles/profile-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createProfile, updateProfile } from "@/lib/profiles/actions";
import { maskPan } from "@/lib/profiles/pan";
import {
  emptyProfileFormValues,
  toProfileFormValues,
  type ProfileFormValues,
} from "@/lib/profiles/schema";

type EditableProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  panNumber: string | null;
  isActive: boolean;
};

type ProfileSettingsProps = {
  profiles: EditableProfile[];
};

export function ProfileSettings({ profiles }: ProfileSettingsProps) {
  return (
    <div className="grid gap-6">
      {profiles.map((profile) => {
        const masked = maskPan(profile.panNumber);

        return (
          <Card key={profile.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {profile.name}
                {profile.isActive ? (
                  <Badge variant="secondary">Active</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>
                {masked ? `PAN ${masked}` : "No PAN recorded"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                defaultValues={toProfileFormValues(profile)}
                submitLabel="Save changes"
                onSubmitAction={(values: ProfileFormValues) =>
                  updateProfile(profile.id, values)
                }
              />
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Add a profile</CardTitle>
          <CardDescription>
            Each profile keeps its own holdings, snapshots, tags and research.
            Data is never shared between profiles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultValues={emptyProfileFormValues}
            submitLabel="Create profile"
            onSubmitAction={createProfile}
            resetOnSuccess
          />
        </CardContent>
      </Card>
    </div>
  );
}
