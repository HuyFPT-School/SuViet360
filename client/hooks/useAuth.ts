"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/authApi";
import { setLoading, setUser } from "@/store/features/authSlice";
import { useAppDispatch, useAppSelector } from "@/store";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const refreshUser = useCallback(async () => {
    dispatch(setLoading(true));

    try {
      const response = await authApi.me();
      dispatch(setUser(response.data.user));
      return response.data.user;
    } catch {
      dispatch(setUser(null));
      return null;
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    await authApi.logout();
    dispatch(setUser(null));
    router.push("/login");
  }, [dispatch, router]);

  return {
    user,
    isLoading,
    refreshUser,
    logout,
  };
};
