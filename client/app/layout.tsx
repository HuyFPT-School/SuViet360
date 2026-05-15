import type { Metadata } from "next";
import Link from "next/link";
import Providers from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuViet360",
  description: "Modern full-stack starter with secure authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <Providers>
          <header className="border-b bg-white/90 backdrop-blur">
            <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="text-lg font-semibold text-blue-700">
                SuViet360
              </Link>
              <div className="flex gap-3 text-sm">
                <Link href="/login" className="hover:text-blue-700">
                  Login
                </Link>
                <Link href="/register" className="hover:text-blue-700">
                  Register
                </Link>
                <Link href="/dashboard" className="hover:text-blue-700">
                  Dashboard
                </Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-10">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
