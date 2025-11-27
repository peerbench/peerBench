"use client";

import * as yup from "yup";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import {
  LucideGlobe,
  LucideLoader2,
  LucidePen,
  LucideUser,
} from "lucide-react";
import {
  SiGithub,
  SiBluesky,
  SiMastodon,
  SiX,
} from "@icons-pack/react-simple-icons";
import { FormInputError } from "@/components/form-input-error";
import { useProfile, useUpdateProfile } from "@/lib/react-query/use-profile";
import { ensureHttpProtocol } from "@/utils/url";
import { errorMessage } from "@/utils/error-message";
import { CopyButton } from "@/components/copy-button";
import { usePageContext } from "../context";

const profileSchema = yup.object({
  displayName: yup.string().nullable().notRequired(),
  github: yup.string().nullable().notRequired().url(),
  website: yup.string().nullable().notRequired().url(),
  bluesky: yup.string().nullable().notRequired(),
  mastodon: yup.string().nullable().notRequired(),
  twitter: yup.string().nullable().notRequired(),
});

type ProfileFormData = yup.InferType<typeof profileSchema>;

export function ProfileForm() {
  const {
    currentUser,
    organization,
    isLookingUpOrg,
    isAffiliated,
    isCheckingAffiliation,
    isAddingAffiliation,
    addAffiliation,
  } = usePageContext();
  const updateProfileMutation = useUpdateProfile();
  const { data: profile } = useProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema) as any,
    defaultValues: {
      displayName: "",
      github: "",
      website: "",
      bluesky: "",
      mastodon: "",
      twitter: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName || "",
        github: profile.github || "",
        website: profile.website || "",
        bluesky: profile.bluesky || "",
        mastodon: profile.mastodon || "",
        twitter: profile.twitter || "",
      });
    }
  }, [profile, reset]);

  const handleProfileSave = async (data: ProfileFormData) => {
    updateProfileMutation
      .mutateAsync(data)
      .then(() => toast.success("Profile updated successfully!"))
      .catch((error) => {
        console.error(error);
        toast.error(`Failed to update profile: ${errorMessage(error)}`);
      });
  };

  return (
    <Card className="w-full col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LucideUser className="h-5 w-5" />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleProfileSave)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-2 gap-6 bg-gray-50 rounded-lg p-4">
              <div className="p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <CopyButton
                  text={currentUser?.email || profile?.email || ""}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={!currentUser?.email && !profile?.email}
                >
                  <span className="text-gray-600">
                    {currentUser?.email || profile?.email || "No email"}
                  </span>
                </CopyButton>
              </div>
              <div className="p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID (UUID)
                </label>
                <CopyButton
                  text={currentUser?.id || ""}
                  variant="outline"
                  className="w-full justify-start font-mono text-sm"
                  disabled={!currentUser?.id}
                >
                  <span className="text-gray-600">
                    {currentUser?.id || "No user ID"}
                  </span>
                </CopyButton>
              </div>
            </div>

            {/* Organization Affiliation */}
            {organization && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Organization Affiliation
                </label>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-800">
                    {organization.name}
                  </p>
                  {organization.country && (
                    <p className="text-xs text-blue-600">
                      {organization.country}
                      {organization.alpha_two_code &&
                        ` (${organization.alpha_two_code})`}
                    </p>
                  )}
                  {organization.web_page && (
                    <p className="text-xs text-blue-600">
                      <a
                        href={ensureHttpProtocol(organization.web_page)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {organization.web_page}
                      </a>
                    </p>
                  )}

                  <div className="pt-2">
                    {isCheckingAffiliation ? (
                      <div className="text-sm text-gray-500">
                        Checking affiliation status...
                      </div>
                    ) : isAffiliated ? (
                      <div className="flex items-center text-sm text-green-600">
                        <svg
                          className="h-4 w-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        You are affiliated with this organization
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={addAffiliation}
                          disabled={isAddingAffiliation}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          type="button"
                        >
                          {isAddingAffiliation
                            ? "Adding..."
                            : "Confirm Affiliation"}
                        </Button>
                        <p className="text-sm text-gray-600">
                          Click to confirm you are affiliated with this
                          organization
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Organization Lookup Loading */}
            {isLookingUpOrg && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Affiliation
                </label>
                <div className="flex items-center text-sm text-gray-500">
                  <LucideLoader2 className="h-4 w-4 mr-2 animate-spin" />
                  Looking up your organization...
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 space-x-6 space-y-4">
            {/* Display Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <LucidePen className="h-4 w-4" />
                Display Name
              </label>
              <FormInputError error={errors.displayName} position="below">
                <Input
                  {...register("displayName")}
                  type="text"
                  placeholder="Enter your display name"
                  className={`max-w-md ${errors.displayName ? "border-red-500" : ""}`}
                />
              </FormInputError>
            </div>

            {/* Website */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <LucideGlobe className="h-4 w-4" />
                Website
              </label>
              <FormInputError error={errors.website} position="below">
                <Input
                  {...register("website")}
                  type="url"
                  placeholder="https://yourwebsite.com"
                  className={`max-w-md ${errors.website ? "border-red-500" : ""}`}
                />
              </FormInputError>
            </div>

            {/* GitHub */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <SiGithub className="h-4 w-4" />
                GitHub
              </label>
              <FormInputError error={errors.github} position="below">
                <Input
                  {...register("github")}
                  type="url"
                  placeholder="https://github.com/username"
                  className={`max-w-md ${errors.github ? "border-red-500" : ""}`}
                />
              </FormInputError>
            </div>
            {/* Bluesky */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <SiBluesky className="h-4 w-4" />
                Bluesky
              </label>
              <FormInputError error={errors.bluesky} position="below">
                <Input
                  {...register("bluesky")}
                  type="text"
                  placeholder="@username.bsky.social"
                  className={`max-w-md ${errors.bluesky ? "border-red-500" : ""}`}
                />
              </FormInputError>
            </div>

            {/* Mastodon */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <SiMastodon className="h-4 w-4" />
                Mastodon
              </label>
              <FormInputError error={errors.mastodon} position="below">
                <Input
                  {...register("mastodon")}
                  type="text"
                  placeholder="@username@mastodon.social"
                  className={`max-w-md ${errors.mastodon ? "border-red-500" : ""}`}
                />
              </FormInputError>
            </div>

            {/* Twitter */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <SiX className="h-4 w-4" />
                Twitter
              </label>
              <FormInputError error={errors.twitter} position="below">
                <Input
                  {...register("twitter")}
                  type="text"
                  placeholder="@username"
                  className={`max-w-md ${errors.twitter ? "border-red-500" : ""}`}
                />
              </FormInputError>
            </div>
          </div>

          {/* Profile Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting}
              variant="default"
              size="default"
            >
              {isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
