"use client";

import { PropsWithChildren, useEffect, useMemo } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import { setTheme, type ThemeMode } from "@/store/features/uiSlice";

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

  return <Provider store={store}>{children}</Provider>;
}
