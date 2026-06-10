import Link from "next/link";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

const ERAS = [
  { icon: "🥁", name: "Hùng Vương", sub: "Trống Đồng" },
  { icon: "⚔️", name: "Đinh · Lê · Lý · Trần", sub: "Hào Kiệt Chân Trần" },
  { icon: "📜", name: "Lê · Nguyễn", sub: "Thanh Gươm Phong Chủ" },
  { icon: "🏙️", name: "Hiện Đại", sub: "Dân Tộc Hiện Đại" },
];

const LESSONS = [
  { title: "Bí ẩn Cố đô Huế", tag: "Lịch sử" },
  { title: "Huyền thoại Hai Bà Trưng", tag: "Nhân vật" },
];

const RESOURCES = [
  { icon: "🎬", label: "Video" },
  { icon: "📖", label: "Ebook" },
  { icon: "🗺️", label: "Bản đồ" },
  { icon: "🧩", label: "Câu đố" },
];

const EVENTS = [
  {
    title: "Discussion Lịch sử",
    tag: "Diễn đàn",
    date: "20 Tháng 5, 2026",
    desc: "Cùng nhau thảo luận về những sự kiện lịch sử nổi bật trong thế kỷ XX.",
    icon: "💬",
  },
  {
    title: "Webinar · Lịch Sử",
    tag: "Trực tuyến",
    date: "25 Tháng 5, 2026",
    desc: "Webinar chuyên sâu về triều đại nhà Nguyễn và di sản văn hoá còn lại.",
    icon: "🎙️",
  },
  {
    title: "Cập nhật mới nhất",
    tag: "Tin tức",
    date: "18 Tháng 5, 2026",
    desc: "Khám phá những nội dung và tài liệu lịch sử vừa được cập nhật trên nền tảng.",
    icon: "📰",
  },
  {
    title: "Sự Kiện Gần Đây",
    tag: "Tin tức",
    date: "18 Tháng 5, 2026",
    desc: "Khám phá những nội dung và tài liệu lịch sử vừa được cập nhật trên nền tảng.",
    icon: "📰",
  },
];

export default function Home() {
  return (
    <div>

      {/* ── HERO ── */}
      <section className="relative isolate overflow-hidden" style={{ height: "600px" }}>
        <Image
          src="/images/HeroSection.png"
          alt="Phù điêu hành trình lịch sử Việt"
          fill
          priority
          className="object-cover object-[93%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0a06]/85 via-[#1a0a06]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0705]/60 via-transparent to-transparent" />

        <div className="sv-hero-entry relative z-10 flex h-full flex-col justify-center px-8 lg:px-16 max-w-2xl">
          <span className="mb-3 font-display text-xs uppercase tracking-[0.35em] text-amber-300/80">
            Hành Trình Khám Phá
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight text-amber-50 md:text-5xl lg:text-6xl">
            Lịch Sử Việt
            <span className="block text-amber-300">Nam</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-amber-100/75 md:text-base leading-relaxed">
            Khám phá hành trình lịch sử Việt Nam từ Cách mạng tháng Tám 1945 đến công cuộc Đổi mới và hội nhập hiện đại.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-[#2a120b] shadow-[0_4px_20px_rgba(197,151,76,0.4)] transition hover:bg-amber-400"
            >
              Bắt đầu ngay
            </Link>
            <Link
              href="/library"
              className="rounded-full border border-amber-200/50 px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-amber-100/90 transition hover:border-amber-100/80 hover:text-amber-50"
            >
              Tìm hiểu thêm
            </Link>
          </div>

          <div className="mt-8 flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === 0 ? "w-6 bg-amber-400" : "w-1.5 bg-amber-200/30"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTENT SECTIONS ── */}
      <div className="sv-content-vintage">
        <div className="sv-content-inner space-y-12 px-6 py-12 lg:px-12">

          {/* ── KHÁM PHÁ CÁC THỜI KỲ ── */}
          <section>
            <AnimateIn variant="fade-up">
              <SectionHeader title="Khám Phá Các Thời Kỳ" />
            </AnimateIn>
            <AnimateIn variant="fade-up" delay={60} stagger className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {ERAS.map((era) => (
                <Link
                  key={era.name}
                  href="#"
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-amber-200/50 bg-white/95 px-4 py-6 text-center shadow-[0_8px_20px_rgba(28,18,12,0.12)] transition hover:border-amber-300"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/60 bg-amber-50 text-2xl shadow-sm">
                    {era.icon}
                  </span>
                  <div>
                    <p className="font-display text-xs font-semibold uppercase tracking-wide text-slate-900">
                      {era.name}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{era.sub}</p>
                  </div>
                </Link>
              ))}
            </AnimateIn>
          </section>

          {/* ── BÀI HỌC + TÀI LIỆU ── */}
          <div className="grid gap-8 lg:grid-cols-[1fr_auto]">

            <section>
              <AnimateIn variant="fade-right">
                <SectionHeader title="Bài Học Nổi Bật" />
              </AnimateIn>
              <AnimateIn variant="fade-right" delay={80} stagger className="mt-6 grid gap-4 sm:grid-cols-2">
                {LESSONS.map((l) => (
                  <Link
                    key={l.title}
                    href="#"
                    className="group relative overflow-hidden rounded-2xl border border-amber-200/50 bg-white/95 shadow-[0_8px_20px_rgba(28,18,12,0.12)] transition hover:border-amber-300"
                  >
                    <div className="h-40 w-full bg-amber-50/60 border-b border-amber-200/40" />
                    <div className="px-4 py-3">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-slate-600">{l.tag}</span>
                      <p className="mt-1 font-display text-sm font-semibold text-slate-900">{l.title}</p>
                    </div>
                  </Link>
                ))}
              </AnimateIn>
            </section>

            <section className="shrink-0">
              <AnimateIn variant="fade-left">
                <SectionHeader title="Tài Liệu Miễn Phí" />
              </AnimateIn>
              <AnimateIn variant="fade-left" delay={80} stagger className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                {RESOURCES.map((r) => (
                  <Link
                    key={r.label}
                    href="#"
                    className="group flex flex-col items-center gap-2 rounded-2xl border border-amber-200/50 bg-white/95 px-6 py-5 text-center shadow-[0_6px_16px_rgba(28,18,12,0.1)] transition hover:border-amber-300"
                  >
                    <span className="text-3xl">{r.icon}</span>
                    <span className="font-display text-xs font-semibold uppercase tracking-wide text-slate-900">
                      {r.label}
                    </span>
                  </Link>
                ))}
              </AnimateIn>
            </section>
          </div>

          {/* ── SỰ KIỆN GẦN ĐÂY ── */}
          <section>
            <AnimateIn variant="fade-up">
              <SectionHeader title="Sự Kiện Gần Đây" />
            </AnimateIn>
            <AnimateIn variant="fade-scale" delay={60} stagger className="mt-6 grid gap-5 sm:grid-cols-3">
              {EVENTS.map((e) => (
                <Link
                  key={e.title}
                  href="#"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-amber-200/50 bg-white/95 shadow-[0_8px_20px_rgba(28,18,12,0.12)] transition hover:border-amber-300 hover:shadow-[0_12px_28px_rgba(28,18,12,0.18)]"
                >
                  {/* Thumbnail area */}
                  <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/60 border-b border-amber-200/40 flex items-center justify-center">
                    <span className="text-5xl opacity-30 group-hover:opacity-50 transition-opacity duration-300">
                      {e.icon}
                    </span>
                    {/* Tag badge */}
                    <span className="absolute top-3 left-3 rounded-full bg-amber-500/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow-sm">
                      {e.tag}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 px-4 py-4 gap-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-amber-700/70 font-medium">
                      {e.date}
                    </p>
                    <p className="font-display text-sm font-semibold text-slate-900 leading-snug">
                      {e.title}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {e.desc}
                    </p>
                  </div>

                  {/* CTA row */}
                  <div className="px-4 pb-4">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 group-hover:text-amber-800 transition-colors">
                      Xem chi tiết
                      <svg className="w-3 h-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6h8M6 2l4 4-4 4" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </AnimateIn>
          </section>

        </div>
      </div>

      {/* ── MEMBERSHIP CTA BANNER ── */}
      <section className="sv-membership-cta">
        <div className="sv-membership-cta-inner">
          {/* Decorative corner ornaments */}
          <span className="sv-cta-ornament sv-cta-ornament-tl" aria-hidden>✦</span>
          <span className="sv-cta-ornament sv-cta-ornament-tr" aria-hidden>✦</span>

          <p className="sv-cta-eyebrow">Ưu Đãi Độc Quyền</p>
          <h2 className="sv-cta-title">Đăng Ký Thành Viên Ngay Hôm Nay!</h2>
          <p className="sv-cta-sub">
            Nhận ngay voucher giảm <strong>10%</strong> cho đơn hàng đầu tiên. Tích điểm đổi quà hấp dẫn và nhiều ưu đãi độc quyền khác.
          </p>
          <Link href="/register" className="sv-cta-btn">
            Đăng Ký Ngay
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="sv-footer-new">
        <div className="sv-footer-new-inner">
          <div className="sv-footer-brand-col">
            <div className="sv-footer-logo-wrap">
              <img
                className="sv-footer-logo-img"
                src="/images/Logo_SuViet-remove.png"
                alt="Hành Trình Sử Việt"
              />
              <div className="sv-footer-brand-name">
                Hành Trình<br />Sử Việt
              </div>
            </div>
            <p className="sv-footer-tagline">
              Khám phá hành trình lịch sử Việt Nam từ Cách mạng tháng Tám 1945 đến công cuộc Đổi mới và hội nhập hiện đại.
            </p>
            <div className="sv-footer-socials">
              <span className="sv-social-btn">FB</span>
              <span className="sv-social-btn">YT</span>
              <span className="sv-social-btn">IN</span>
              <span className="sv-social-btn">TT</span>
            </div>
          </div>

          <div className="sv-footer-col">
            <h4>Trang Chủ</h4>
            <ul>
              <li><a href="#">Giới Thiệu</a></li>
              <li><a href="#">Hoài Sử</a></li>
              <li><a href="#">Thành Viên</a></li>
              <li><a href="#">Hùng Vương</a></li>
            </ul>
          </div>

          <div className="sv-footer-col">
            <h4>Khám Phá</h4>
            <ul>
              <li><a href="#">Bản Đồ Di Sản</a></li>
              <li><a href="#">Hành Trình</a></li>
              <li><a href="#">Thư Viện</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>

          <div className="sv-footer-col">
            <h4>Tài Nguyên</h4>
            <ul>
              <li><a href="#">Video</a></li>
              <li><a href="#">Ebook</a></li>
              <li><a href="#">Bản Đồ</a></li>
              <li><a href="#">Câu Đố</a></li>
            </ul>
          </div>

          <div className="sv-footer-col">
            <h4>Cộng Đồng</h4>
            <ul>
              <li><a href="#">Bảng Vàng</a></li>
              <li><a href="#">Kho Báu</a></li>
              <li><a href="#">Diễn Đàn</a></li>
              <li><a href="#">Sự Kiện</a></li>
            </ul>
          </div>
        </div>

        <div className="sv-footer-bottom-line">
          <div className="sv-footer-bottom">
            <span>© 2026 Hành Trình Sử Việt. Bảo lưu mọi quyền.</span>
            <span className="sv-footer-badge">Được xây dựng với ❤ tại Việt Nam</span>
            <span>Chính Sách Bảo Mật · Điều Khoản Dịch Vụ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-gradient-to-r from-black/40 to-transparent" />
      <h2 className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-black">
        {title}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-l from-black/40 to-transparent" />
    </div>
  );
}