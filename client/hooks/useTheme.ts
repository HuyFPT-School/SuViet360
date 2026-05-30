"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { setTheme, type ThemeMode } from "@/store/features/uiSlice";

export const useTheme = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  const updateTheme = useCallback(
    (mode: ThemeMode) => {
      dispatch(setTheme(mode));
    },
    [dispatch]
  );

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    dispatch(setTheme(next));
  }, [dispatch, theme]);

  return {
    theme,
    setTheme: updateTheme,
    toggleTheme,
  };
};
