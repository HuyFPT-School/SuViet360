"use client";

import { PropsWithChildren, useEffect, useMemo } from "react";
import { Provider } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { makeStore } from "@/store";
import { setTheme, type ThemeMode } from "@/store/features/uiSlice";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "9217582187-qcqif9q8eaoj0ibq80isbrma8t82eec5.apps.googleusercontent.com";

export default function Providers({ children }: PropsWithChildren) {
  const store = useMemo(() => makeStore(), []);
  useEffect(() => {
    const stored = window.localStorage.getItem("sv-theme");
    if (stored === "light" || stored === "dark") {
      store.dispatch(setTheme(stored as ThemeMode));
    }

    const applyTheme = () => {
      const nextTheme = store.getState().ui.theme;
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem("sv-theme", nextTheme);
    };

    applyTheme();

    const unsubscribe = store.subscribe(() => {
      applyTheme();
    });

    return unsubscribe;
  }, [store]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Provider store={store}>{children}</Provider>
    </GoogleOAuthProvider>
  );
}
