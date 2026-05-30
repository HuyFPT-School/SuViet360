import { api } from "@/lib/api";
import type { User } from "@/types/auth";

interface ProfileResponse {
  data: {
    user: User;
  };
  message?: string;
}

interface AvatarResponse {
  data: {
    avatar: string;
  };
  message?: string;
}

const ensureCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>(
    "/csrf-token"
  );
  return response.data.data.csrfToken;
};

export interface ProfileUpdatePayload {
  name?: string;
  phone?: string;
  birthDate?: string;
  gender?: "male" | "female" | "other";
  address?: string;
  bio?: string;
}

export const profileApi = {
  updateProfile: async (payload: ProfileUpdatePayload) => {
    const token = await ensureCsrfToken();
    const response = await api.patch<ProfileResponse>(
      "/user/profile",
      payload,
      {
        headers: { "x-csrf-token": token },
      }
    );
    return response.data;
  },

  uploadAvatar: async (file: File) => {
    const token = await ensureCsrfToken();
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await api.post<AvatarResponse>(
      "/user/avatar",
      formData,
      {
        headers: {
          "x-csrf-token": token,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  deleteAvatar: async () => {
    const token = await ensureCsrfToken();
    const response = await api.delete("/user/avatar", {
      headers: { "x-csrf-token": token },
    });
    return response.data;
  },
};
