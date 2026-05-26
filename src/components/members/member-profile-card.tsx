"use client";

import * as React from "react";
import { useActionState } from "react";
import { Camera, KeyRound, Mail, MapPin, Phone, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateMyPassword,
  updateProfileDetails,
  type ProfileFormState,
} from "@/lib/profile/actions";
import type { MemberProfile } from "@/lib/profile/queries";
import { APP_ROLE_LABEL } from "@/types/project";
import { formatDate } from "@/lib/format";

import { AvatarCropDialog } from "./avatar-cropper";

const INITIAL: ProfileFormState = { ok: false };

export function MemberProfileCard({
  profile,
  canEdit,
  canChangePassword = false,
}: {
  profile: MemberProfile;
  canEdit: boolean;
  canChangePassword?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [detailsState, detailsAction, detailsPending] = useActionState(
    async (prev: ProfileFormState, formData: FormData) => {
      const result = await updateProfileDetails(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    INITIAL,
  );

  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [passwordState, passwordAction, passwordPending] = useActionState(
    async (prev: ProfileFormState, formData: FormData) => {
      const result = await updateMyPassword(prev, formData);
      if (result.ok) setPasswordOpen(false);
      return result;
    },
    INITIAL,
  );

  const initials = (profile.fullName ?? profile.email ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="size-24 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-secondary)]">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName ?? "Avatar"}
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-2xl font-semibold text-[var(--color-muted-foreground)]">
                  {initials}
                </div>
              )}
            </div>

            {canEdit ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = ""; // allow re-picking the same file
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () =>
                      setCropSrc(
                        typeof reader.result === "string"
                          ? reader.result
                          : null,
                      );
                    reader.readAsDataURL(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Change photo"
                  title="Change photo"
                  className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-sm transition-colors hover:text-[var(--color-foreground)]"
                >
                  <Camera className="size-4" />
                </button>
              </>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight">
                  {profile.fullName ?? "Unnamed"}
                </h2>
                {profile.title ? (
                  <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                    {profile.title}
                  </p>
                ) : null}
              </div>
              {canEdit || canChangePassword ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {canChangePassword ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPasswordOpen(true)}
                    >
                      <KeyRound />
                      Password
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpen(true)}
                    >
                      <Pencil />
                      Edit
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-[var(--color-muted-foreground)]">
              <Badge variant="outline">{APP_ROLE_LABEL[profile.role]}</Badge>
              {profile.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {profile.email}
                </span>
              ) : null}
              {profile.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {profile.phone}
                </span>
              ) : null}
              {profile.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {profile.location}
                </span>
              ) : null}
              <span>Joined {formatDate(profile.createdAt)}</span>
            </div>

            {profile.bio ? (
              <p className="mt-4 whitespace-pre-wrap text-sm">{profile.bio}</p>
            ) : null}
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Update the basic details shown on this profile.
            </DialogDescription>
          </DialogHeader>

          <form action={detailsAction} className="flex flex-col gap-4">
            <input type="hidden" name="userId" value={profile.id} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                maxLength={100}
                defaultValue={profile.fullName ?? ""}
              />
              {detailsState.fieldErrors?.fullName ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {detailsState.fieldErrors.fullName}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Job title</Label>
              <Input
                id="title"
                name="title"
                maxLength={120}
                defaultValue={profile.title ?? ""}
                placeholder="e.g. Project manager"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  maxLength={40}
                  defaultValue={profile.phone ?? ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  maxLength={120}
                  defaultValue={profile.location ?? ""}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={2000}
                defaultValue={profile.bio ?? ""}
                placeholder="A short summary about this person."
              />
            </div>

            {detailsState.message && !detailsState.ok ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {detailsState.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={detailsPending}>
                {detailsPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {canChangePassword ? (
        <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one.
              </DialogDescription>
            </DialogHeader>

            <form action={passwordAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                {passwordState.fieldErrors?.currentPassword ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {passwordState.fieldErrors.currentPassword}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                />
                {passwordState.fieldErrors?.password ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {passwordState.fieldErrors.password}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                />
                {passwordState.fieldErrors?.confirmPassword ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {passwordState.fieldErrors.confirmPassword}
                  </p>
                ) : null}
              </div>

              {passwordState.message ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {passwordState.message}
                </p>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={passwordPending}>
                  {passwordPending ? "Saving..." : "Change password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {canEdit ? (
        <AvatarCropDialog
          userId={profile.id}
          src={cropSrc}
          onClose={() => setCropSrc(null)}
        />
      ) : null}
    </Card>
  );
}
