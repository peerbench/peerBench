import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfileAPI } from "../hooks/use-profile-api";
import { QK_PROFILE } from "./query-keys";
import type { RequestBodyParams as PatchProfileRequestBodyParams } from "@/app/api/v2/profile/patch";

export function useProfile() {
  const profileAPI = useProfileAPI();

  return useQuery({
    queryKey: [QK_PROFILE],
    queryFn: () => profileAPI.getProfile(),
  });
}

export function useUpdateProfile() {
  const profileAPI = useProfileAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatchProfileRequestBodyParams) =>
      profileAPI.updateProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData([QK_PROFILE], data);
    },
  });
}
