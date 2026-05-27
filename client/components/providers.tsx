"use client";

import { PropsWithChildren, useMemo } from "react";
import { Provider } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { makeStore } from "@/store";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "9217582187-qcqif9q8eaoj0ibq80isbrma8t82eec5.apps.googleusercontent.com";

export default function Providers({ children }: PropsWithChildren) {
  const store = useMemo(() => makeStore(), []);
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Provider store={store}>{children}</Provider>
    </GoogleOAuthProvider>
  );
}
