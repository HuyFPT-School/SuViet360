import type { Metadata } from "next";
import Link from "next/link";
import Providers from "@/components/providers";
import UserMenu from "@/components/user-menu";
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
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full sv-body">
        <Providers>
          <header className="sv-header">
            <nav className="sv-topbar">
              <div className="sv-brand">
                <img
                  className="sv-brand-logo"
                  src="/images/Logo_SuViet-remove.png"
                  alt="Hành Trình Sử Việt"
                />
                <span className="sv-brand-text">Hành Trình Sử Việt</span>
              </div>
              <div className="sv-menu">
                <Link href="/" className="sv-menu-link">
                  Trang Chủ
                </Link>
                <Link href="/explore" className="sv-menu-link">
                  Bản Đồ Di Sản
                </Link>
                <Link href="/library" className="sv-menu-link">
                  Hành Trình
                </Link>
                <Link href="/courses" className="sv-menu-link">
                  Bảng Vàng
                </Link>
                <Link href="/community" className="sv-menu-link">
                  Kho Báu
                </Link>
              </div>
              <div className="sv-search">
                <span className="sv-search-icon" />
                <input
                  className="sv-search-input"
                  placeholder="Tìm kiếm..."
                  aria-label="Tìm kiếm"
                />
              </div>
              <UserMenu />
            </nav>
          </header>
          <main className="sv-main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
