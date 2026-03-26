"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  changeAdminPassword,
  fetchAdminProfile,
  getApiErrorMessage,
  updateAdminProfile,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchAdminProfile,
  });

  const [editInfoMode, setEditInfoMode] = useState(false);
  const [editPasswordMode, setEditPasswordMode] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  const profile = profileQuery.data;

  const initialProfileState = useMemo(() => {
    const fullName = profile?.name || "";
    const nameParts = fullName.split(" ");
    return {
      firstName: profile?.firstName || nameParts[0] || "",
      lastName: profile?.lastName || nameParts.slice(1).join(" ") || "",
      email: profile?.email || "",
      phone: profile?.phone || "(307) 555-0133",
      bio:
        profile?.bio ||
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    };
  }, [profile]);

  const [profileState, setProfileState] = useState(initialProfileState);
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null,
  );
  const [profilePicturePreview, setProfilePicturePreview] = useState("");

  useEffect(() => {
    setProfileState(initialProfileState);
  }, [initialProfileState]);

  useEffect(() => {
    if (!profilePictureFile) return;
    const nextPreview = URL.createObjectURL(profilePictureFile);
    setProfilePicturePreview(nextPreview);
    return () => URL.revokeObjectURL(nextPreview);
  }, [profilePictureFile]);

  useEffect(() => {
    if (!profilePictureFile) {
      setProfilePicturePreview(profile?.profile?.url || "");
    }
  }, [profile?.profile?.url, profilePictureFile]);

  const updateMutation = useMutation({
    mutationFn: updateAdminProfile,
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setEditInfoMode(false);
      setProfilePictureFile(null);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const changePasswordMutation = useMutation({
    mutationFn: changeAdminPassword,
    onSuccess: () => {
      toast.success("Password changed successfully");
      setEditPasswordMode(false);
      setPasswordState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const handleInfoSave = (event: FormEvent) => {
    event.preventDefault();
    const payload = new FormData();
    payload.append("firstName", profileState.firstName);
    payload.append("lastName", profileState.lastName);
    payload.append(
      "name",
      `${profileState.firstName} ${profileState.lastName}`.trim(),
    );
    payload.append("email", profileState.email);
    if (profilePictureFile) {
      payload.append("picture", profilePictureFile);
    }
    updateMutation.mutate(payload);
  };

  const handlePasswordSave = (event: FormEvent) => {
    event.preventDefault();
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    changePasswordMutation.mutate(passwordState);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="rounded-xl border border-[#ffd6d6] bg-[#fff5f5] p-6 text-[#d53d3d]">
        {getApiErrorMessage(profileQuery.error, "Unable to load profile")}
      </div>
    );
  }

  const profileImageSrc = profilePicturePreview || profile?.profile?.url || "";

  return (
    <div className="space-y-4">
      <Card className="content-shell">
        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
          <div className="relative h-20 w-20">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-[#d8ddd1]">
              {profileImageSrc ? (
                <Image
                  src={profileImageSrc}
                  alt={profile.name || "Profile"}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            {editInfoMode ? (
              <>
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setProfilePictureFile(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => profileImageInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 rounded-full border border-white bg-[#079938] p-1.5 text-white shadow"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
          </div>
          <div>
            <h1 className="text-[24px] font-semibold">
              {profile.name ||
                `${profileState.firstName} ${profileState.lastName}`.trim()}
            </h1>
            <p className="text-[16px] text-[#4d4d4d]">Super admin</p>
          </div>
        </CardContent>
      </Card>

      <Card className="content-shell">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[24px] font-semibold">Personal Information</h2>
            <Button
              variant="default"
              size="sm"
              className="h-10 w-[96px] text-base"
              onClick={() => setEditInfoMode((prev) => !prev)}
            >
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
          </div>
          <form onSubmit={handleInfoSave} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div>
                  <Label className="text-[20px] font-medium text-[#444]">
                    First Name
                  </Label>
                </div>
                <div>
                  <Input
                    value={profileState.firstName}
                    onChange={(event) =>
                      setProfileState((prev) => ({
                        ...prev,
                        firstName: event.target.value,
                      }))
                    }
                    disabled={!editInfoMode}
                    className="border-[#d8d8d8]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[20px] font-medium text-[#444]">
                    Last Name
                  </Label>
                </div>
                <div>
                  <Input
                    value={profileState.lastName}
                    onChange={(event) =>
                      setProfileState((prev) => ({
                        ...prev,
                        lastName: event.target.value,
                      }))
                    }
                    disabled={!editInfoMode}
                    className="border-[#d8d8d8]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[20px] font-medium text-[#444]">
                    Email Address
                  </Label>
                </div>
                <div>
                  <Input
                    type="email"
                    value={profileState.email}
                    onChange={(event) =>
                      setProfileState((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    disabled={!editInfoMode}
                    className="border-[#d8d8d8]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[20px] font-medium text-[#444]">
                    Phone
                  </Label>
                </div>
                <div>
                  <Input
                    value={profileState.phone}
                    onChange={(event) =>
                      setProfileState((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    disabled={!editInfoMode}
                    className="border-[#d8d8d8]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Label className="text-[20px] font-medium text-[#444]">Bio</Label>
              </div>
              <div>
                <Textarea
                  value={profileState.bio}
                  onChange={(event) =>
                    setProfileState((prev) => ({
                      ...prev,
                      bio: event.target.value,
                    }))
                  }
                  disabled={!editInfoMode}
                  className="min-h-32 border-[#d8d8d8]"
                />
              </div>
            </div>

            {editInfoMode ? (
              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="h-12 w-[252px] rounded-lg p-2 text-[16px]"
                  disabled={updateMutation.isPending}
                >
                  Save changes
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="content-shell">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[24px] font-semibold">Change password</h2>
            <Button
              variant="default"
              size="sm"
              className="h-10 w-[96px] text-base"
              onClick={() => setEditPasswordMode((prev) => !prev)}
            >
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
          </div>
          <form onSubmit={handlePasswordSave}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div>
                  <Label className="text-[20px] font-medium text-[#444]">
                    Current Password
                  </Label>
                </div>
                <div>
                  <PasswordInput
                    value={passwordState.currentPassword}
                    onChange={(event) =>
                      setPasswordState((prev) => ({
                        ...prev,
                        currentPassword: event.target.value,
                      }))
                    }
                    disabled={!editPasswordMode}
                    className="border-[#aeb7c8]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[20px] font-medium text-[#444]">
                    New Password
                  </Label>
                </div>
                <div>
                  <PasswordInput
                    value={passwordState.newPassword}
                    onChange={(event) =>
                      setPasswordState((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                    disabled={!editPasswordMode}
                    className="border-[#aeb7c8]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[20px] font-medium text-[#444]">
                    Confirm New Password
                  </Label>
                </div>
                <div>
                  <PasswordInput
                    value={passwordState.confirmPassword}
                    onChange={(event) =>
                      setPasswordState((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                    disabled={!editPasswordMode}
                    className="border-[#aeb7c8]"
                  />
                </div>
              </div>
            </div>

            {editPasswordMode ? (
              <div className="mt-5 flex justify-center">
                <Button
                  type="submit"
                  className="h-12 w-[252px] rounded-lg p-2 text-[16px]"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending
                    ? "Saving..."
                    : "Save changes"}
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
