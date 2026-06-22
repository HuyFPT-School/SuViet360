import { useCallback } from 'react';
import { authApi } from '@/services/authApi';
import { setLoading, setUser } from '@/store/features/authSlice';
import { useAppDispatch, useAppSelector } from '@/store';

export const useAuth = () => {
  const dispatch = useAppDispatch();
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
  }, [dispatch]);

  return {
    user,
    isLoading,
    refreshUser,
    logout,
  };
};
