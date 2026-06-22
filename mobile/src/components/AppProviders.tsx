import React, { useMemo, useEffect } from 'react';
import { Provider } from 'react-redux';
import { makeStore, useAppDispatch } from '@/store';
import { setUser, setLoading } from '@/store/features/authSlice';
import { authApi } from '@/services/authApi';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const init = async () => {
      dispatch(setLoading(true));
      try {
        const response = await authApi.me();
        dispatch(setUser(response.data.user));
      } catch {
        dispatch(setUser(null));
      }
    };
    init();
  }, [dispatch]);

  return <>{children}</>;
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => makeStore(), []);

  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
