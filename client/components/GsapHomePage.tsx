"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { api } from "@/lib/api";
import "./gsap-homepage.css";

gsap.registerPlugin(ScrollTrigger);

const MOCK_LEADERBOARD = [
  { name: "Nguyễn Minh Huy", xp: 2385, avatar: "" },
  { name: "Lê Khánh Linh", xp: 2270, avatar: "" },
  { name: "Trần Anh Đức", xp: 2190, avatar: "" }
];

const MOCK_PODCASTS = [
  { _id: "mock1", title: "Ký sự Chiến dịch Điện Biên Phủ 1954", duration: 720, level: "Lớp 12" },
  { _id: "mock2", title: "Chiến dịch Hồ Chí Minh & Đại thắng 1975", duration: 900, level: "Lớp 12" }
];

const GRADE_12_LESSONS_FALLBACK = [
  {
    _id: "ls1",
    title: "Chiến dịch Điện Biên Phủ 1954",
    tag: "Việt Nam (1945-1954)",
    content: "Đỉnh cao của cuộc kháng chiến chống Pháp, lừng lẫy năm châu, chấn động địa cầu.",
    img: "/images/dien_bien_phu.png",
  },
  {
    _id: "ls2",
    title: "Cách mạng Tháng Tám năm 1945",
    tag: "Việt Nam (1930-1945)",
    content: "Tổng khởi nghĩa giành chính quyền, mở ra kỷ nguyên độc lập tự do cho dân tộc.",
    img: "/images/thang_long.png",
  },
  {
    _id: "ls3",
    title: "Chiến dịch Hồ Chí Minh 1975",
    tag: "Việt Nam (1954-1975)",
    content: "Trận tiến công chiến lược cuối cùng giải phóng hoàn toàn Miền Nam, thống nhất đất nước.",
    img: "/images/bach_dang_battle.png",
  },
  {
    _id: "ls4",
    title: "Công cuộc Đổi mới từ năm 1986",
    tag: "Việt Nam (1975-2000)",
    content: "Đại hội Đảng VI 1986 đưa đất nước thoát khỏi khủng hoảng, hội nhập kinh tế toàn cầu.",
    img: "/images/hue_citadel.png",
  },
  {
    _id: "ls5",
    title: "Trật tự Thế giới hai cực I-an-ta",
    tag: "Thế giới (1945-2000)",
    content: "Hội nghị I-an-ta và sự hình thành cục diện Chiến tranh Lạnh giữa hai siêu cường Mỹ - Liên Xô.",
    img: "/images/chi_lang.png",
  },
  {
    _id: "ls6",
    title: "Phong trào Dân tộc Dân chủ (1919-1930)",
    tag: "Việt Nam (1919-1930)",
    content: "Sự ra đời của Đảng Cộng sản Việt Nam ngày 3/2/1930 và bước ngoặt lịch sử dân tộc.",
    img: "/images/van_mieu.png",
  },
];

const GRADE_12_PILLARS = [
  {
    id: "g12-pillar-1",
    title: "LỊCH SỬ THẾ GIỚI HIỆN ĐẠI",
    subtitle: "Giai đoạn 1945 – 2000",
    desc: "Trật tự hai cực I-an-ta, Liên Xô, Mỹ, Tây Âu, Nhật Bản và xu thế toàn cầu hóa kinh tế.",
    tag: "Lịch Sử Thế Giới",
    img: "/images/chi_lang.png",
    color: "#4a7fb5",
  },
  {
    id: "g12-pillar-2",
    title: "VIỆT NAM TỪ 1919 ĐẾN 1945",
    subtitle: "Giai đoạn 1919 – 1945",
    desc: "Phong trào dân tộc dân chủ, Đảng Cộng sản Việt Nam ra đời 1930 và Cách mạng Tháng Tám 1945.",
    tag: "Cách Mạng",
    img: "/images/thang_long.png",
    color: "#c9a15a",
  },
  {
    id: "g12-pillar-3",
    title: "KHÁNG CHIẾN CHỐNG PHÁP & MỸ",
    subtitle: "Giai đoạn 1945 – 1975",
    desc: "Đại thắng Điện Biên Phủ 1954 và Chiến dịch Hồ Chí Minh 1975 giải phóng hoàn toàn Miền Nam.",
    tag: "Kháng Chiến",
    img: "/images/dien_bien_phu.png",
    color: "#d4543a",
  },
  {
    id: "g12-pillar-4",
    title: "ĐỔI MỚI & HỘI NHẬP QUỐC TẾ",
    subtitle: "Giai đoạn 1975 – 2000",
    desc: "Đường lối Đổi mới Đại hội VI (1986), xây dựng đất nước và hội nhập quốc tế toàn diện.",
    tag: "Hội Nhập",
    img: "/images/hue_citadel.png",
    color: "#6b8e6b",
  },
];

const STATS = [
  { value: "LỚP 12", label: "Chương trình trọng tâm" },
  { value: "3.600+", label: "Vectors RAG Lịch sử 12" },
  { value: "100%", label: "Bám sát SGK & Ôn thi" },
  { value: "2D", label: "Mô phỏng sự kiện" },
];

/* ── SVG Icons (No Emojis per AGENTS.md rules) ── */
const TrophyIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
);

const GamepadIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="6" width="20" height="12" rx="6" />
    <path d="M6 12h4m-2-2v4" />
    <circle cx="15" cy="10" r="1" fill="currentColor" />
    <circle cx="18" cy="13" r="1" fill="currentColor" />
  </svg>
);

const HeadphonesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

const BookOpenIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export default function GsapHomePage() {
  const mainRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const heroCTARef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const pillarsRef = useRef<HTMLElement>(null);
  const gameRef = useRef<HTMLElement>(null);
  const splitRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const [particlesReady, setParticlesReady] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    setParticlesReady(true);
    const loadData = async () => {
      try {
        const [lessonsRes, podcastsRes, leaderboardRes] = await Promise.all([
          api.get("/lessons?limit=8"),
          api.get("/podcasts?limit=3"),
          api.get("/progress/leaderboard").catch((err) => {
            console.error("Failed to fetch leaderboard, falling back:", err);
            return { data: { data: { leaderboard: MOCK_LEADERBOARD } } };
          }),
        ]);

        const dbLessons = lessonsRes.data?.data || [];
        const publishedLessons = dbLessons.filter((l: any) => l.status === "Published");
        setLessons(publishedLessons.length > 0 ? publishedLessons : GRADE_12_LESSONS_FALLBACK);

        const dbPodcasts = podcastsRes.data?.data || [];
        const publishedPodcasts = dbPodcasts.filter((p: any) => p.status === "Published");
        setPodcasts(publishedPodcasts.length > 0 ? publishedPodcasts.slice(0, 3) : MOCK_PODCASTS);

        const rawLeaderboard = leaderboardRes.data?.data?.leaderboard || [];
        const formattedLeaderboard = rawLeaderboard.slice(0, 3).map((user: any) => ({
          name: user.name,
          xp: user.xp,
          avatar: user.avatar || "",
        }));
        setLeaderboard(formattedLeaderboard.length > 0 ? formattedLeaderboard : MOCK_LEADERBOARD);
      } catch (err) {
        console.error("Failed to load Grade 12 home page data:", err);
        setLessons(GRADE_12_LESSONS_FALLBACK);
        setPodcasts(MOCK_PODCASTS);
        setLeaderboard(MOCK_LEADERBOARD);
      } finally {
        setDataLoaded(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!mainRef.current || !dataLoaded) return;

    const ctx = gsap.context(() => {
      // 1. Hero Entrance
      const heroTl = gsap.timeline();
      if (heroTitleRef.current) {
        const words = heroTitleRef.current.querySelectorAll(".gsap-word");
        gsap.set(words, { y: 60, opacity: 0 });
        heroTl.to(words, {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.1,
          ease: "power3.out",
        });
      }

      if (heroSubRef.current) {
        gsap.set(heroSubRef.current, { y: 20, opacity: 0 });
        heroTl.to(heroSubRef.current, { y: 0, opacity: 1, duration: 0.8 }, "-=0.4");
      }

      if (heroCTARef.current) {
        const btns = heroCTARef.current.children;
        gsap.set(btns, { y: 20, opacity: 0 });
        heroTl.to(btns, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 }, "-=0.3");
      }

      // 2. Stats Entrance
      if (statsRef.current) {
        const items = statsRef.current.querySelectorAll(".gsap-stat-item");
        gsap.set(items, { y: 30, opacity: 0 });
        ScrollTrigger.create({
          trigger: statsRef.current,
          start: "top 80%",
          onEnter: () => gsap.to(items, { y: 0, opacity: 1, duration: 0.8, stagger: 0.12 }),
        });
      }

      // 3. Pillars Grid Animation
      if (pillarsRef.current) {
        const pillarCards = pillarsRef.current.querySelectorAll(".pillar-card");
        gsap.set(pillarCards, { y: 50, opacity: 0 });
        ScrollTrigger.create({
          trigger: pillarsRef.current,
          start: "top 75%",
          onEnter: () => gsap.to(pillarCards, { y: 0, opacity: 1, duration: 0.8, stagger: 0.15 }),
        });
      }

      // 4. Game Section Reveal
      if (gameRef.current) {
        const gameInner = gameRef.current.querySelector(".game-showcase-box");
        if (gameInner) {
          gsap.set(gameInner, { scale: 0.92, opacity: 0 });
          gsap.to(gameInner, {
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: gameRef.current,
              start: "top 75%",
            },
          });
        }
      }

      // 5. Split Section (Podcast & Leaderboard)
      if (splitRef.current) {
        const left = splitRef.current.querySelector(".split-left");
        const right = splitRef.current.querySelector(".split-right");
        if (left && right) {
          gsap.set(left, { x: -40, opacity: 0 });
          gsap.set(right, { x: 40, opacity: 0 });
          ScrollTrigger.create({
            trigger: splitRef.current,
            start: "top 75%",
            onEnter: () => {
              gsap.to(left, { x: 0, opacity: 1, duration: 0.8 });
              gsap.to(right, { x: 0, opacity: 1, duration: 0.8, delay: 0.2 });
            },
          });
        }
      }

      // 6. CTA Banner
      if (ctaRef.current) {
        const ctaInner = ctaRef.current.querySelector(".cta-box");
        if (ctaInner) {
          gsap.set(ctaInner, { y: 30, opacity: 0 });
          gsap.to(ctaInner, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            scrollTrigger: {
              trigger: ctaRef.current,
              start: "top 80%",
            },
          });
        }
      }
    }, mainRef);

    return () => ctx.revert();
  }, [dataLoaded]);

  return (
    <div ref={mainRef} className="gsap-homepage min-h-screen bg-[#f4ebd9] text-[#2c1a0e]">
      {/* ═══════════════════════════════════════════
          SECTION 1 — CINEMATIC HERO PORTAL (LỊCH SỬ LỚP 12)
          ═══════════════════════════════════════════ */}
      <section className="gsap-hero relative overflow-hidden py-28 px-6 text-center border-b-2 border-[#c9a15a]/40 min-h-[680px] flex items-center justify-center">
        {/* Full-width Relief Artwork Background */}
        <div className="gsap-hero-bg absolute inset-0 z-0">
          <Image
            src="/images/HeroSection.png"
            alt="Phù điêu Lịch Sử Việt Nam SuViet360"
            fill
            priority
            className="object-cover object-center opacity-95"
          />
          {/* Clean dark vignette overlay so the full relief artwork is 100% sharp and clear from top to bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-[#18090b]/85 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.5)_100%)] pointer-events-none" />
        </div>

        {particlesReady &&
          Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="gsap-particle absolute text-[#c9a15a] pointer-events-none opacity-40 drop-shadow"
              style={{
                left: `${8 + Math.random() * 84}%`,
                top: `${12 + Math.random() * 65}%`,
                fontSize: `${10 + Math.random() * 14}px`,
              }}
            >
              {["✦", "◈", "✧", "◆", "❖"][i % 5]}
            </span>
          ))}

        {/* Hero Content (Floating directly over background artwork) */}
        <div className="gsap-hero-content relative z-10 max-w-4xl mx-auto space-y-6 pt-8">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#1e0a0d]/80 border border-[#c9a15a]/70 text-[#f3ddb3] text-xs font-bold uppercase tracking-widest shadow-2xl backdrop-blur-sm" style={{ fontFamily: '"Cinzel", serif' }}>
            <TrophyIcon className="w-4 h-4 text-[#e5b869]" />
            <span>SUVIET360 • NỀN TẢNG HỌC & ÔN THI LỊCH SỬ LỚP 12</span>
          </div>

          <h1 ref={heroTitleRef} className="text-3xl md:text-6xl font-extrabold tracking-wide leading-tight drop-shadow-[0_6px_16px_rgba(0,0,0,0.95)]" style={{ fontFamily: '"Cinzel", serif' }}>
            <span className="gsap-word text-transparent bg-clip-text bg-gradient-to-r from-[#ffe89c] via-[#f8b500] to-[#e4a836]">CHINH PHỤC TOÀN BỘ</span>{" "}
            <br className="hidden md:inline" />
            <span className="gsap-word text-[#fff8ea] drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">LỊCH SỬ LỚP 12</span>
          </h1>

          <p ref={heroSubRef} className="text-base md:text-xl text-[#f6e4c2] max-w-2xl mx-auto leading-relaxed font-semibold drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
            Hệ thống hóa toàn bộ kiến thức Lịch Sử Thế Giới & Việt Nam Hiện Đại (1919 - 2000) qua Mô phỏng 2D sinh động, Podcast ôn tập và AI RAG hỗ trợ 24/7.
          </p>

          <div ref={heroCTARef} className="flex flex-wrap justify-center items-center gap-4 pt-6">
            <Link
              href="/podcasts"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#c9a15a] via-[#e5b869] to-[#9a702e] text-[#1a0f0a] font-bold text-sm uppercase tracking-wider shadow-2xl hover:brightness-110 hover:scale-105 transition duration-200"
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              Podcast Lịch Sử 12
            </Link>
            <Link
              href="/podcasts"
              className="px-8 py-3.5 rounded-xl bg-[#2c1216]/90 text-[#f6e1ba] border-2 border-[#c9a15a]/70 font-bold text-sm uppercase tracking-wider hover:bg-[#4a1f24] hover:scale-105 transition duration-200 shadow-2xl backdrop-blur-sm"
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              Podcast Ôn Thi 12
            </Link>
            <Link
              href="/leaderboard"
              className="px-8 py-3.5 rounded-xl bg-[#110507]/80 text-[#f6e1ba] border border-[#c9a15a]/50 font-bold text-sm uppercase tracking-wider hover:border-[#c9a15a] hover:bg-[#2c1216] hover:scale-105 transition duration-200 shadow-2xl backdrop-blur-sm"
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              Bảng Vàng Thi Đua
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2 — QUICK STATS (LỊCH SỬ LỚP 12)
          ═══════════════════════════════════════════ */}
      <section ref={statsRef} className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#2c1216] border-2 border-[#c9a15a]/50 rounded-2xl p-6 shadow-2xl text-[#f6e1ba]">
          {STATS.map((s) => (
            <div key={s.label} className="gsap-stat-item text-center border-r last:border-r-0 border-[#c9a15a]/30 px-2">
              <div className="text-2xl md:text-3xl font-extrabold text-[#f8b500]" style={{ fontFamily: '"Cinzel", serif' }}>{s.value}</div>
              <div className="text-xs text-[#f6e1ba]/80 mt-1 uppercase font-bold" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3 — 4 CHỦ ĐỀ TRỌNG TÂM LỊCH SỬ LỚP 12
          ═══════════════════════════════════════════ */}
      <section ref={pillarsRef} className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-bold tracking-widest text-[#9a702e]" style={{ fontFamily: '"Cinzel", serif' }}>CHƯƠNG TRÌNH CHUẨN LỚP 12</span>
          <h2 className="text-2xl md:text-4xl font-bold text-[#4a1f24] uppercase tracking-wide mt-1" style={{ fontFamily: '"Cinzel", serif' }}>
            4 MẢNG KIẾN THỨC TRỌNG TÂM LỊCH SỬ 12
          </h2>
          <div className="w-20 h-1 bg-[#c9a15a] mx-auto mt-2 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GRADE_12_PILLARS.map((p) => (
            <div
              key={p.id}
              className="pillar-card bg-[#fcf9f2] border-2 border-[#c9a15a]/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 flex flex-col md:flex-row group"
            >
              <div className="relative w-full md:w-2/5 h-48 md:h-auto overflow-hidden">
                <Image
                  src={p.img}
                  alt={p.title}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 bg-[#2c1216] text-[#f6e1ba] text-[10px] font-bold uppercase px-2.5 py-1 rounded border border-[#c9a15a]/40" style={{ fontFamily: '"Cinzel", serif' }}>
                  {p.tag}
                </span>
              </div>

              <div className="p-6 md:w-3/5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-[#b45309]" style={{ fontFamily: '"Cinzel", serif' }}>{p.subtitle}</span>
                  <h3 className="text-xl font-bold text-[#4a1f24] mt-1 group-hover:text-[#b45309] transition" style={{ fontFamily: '"Cinzel", serif' }}>
                    {p.title}
                  </h3>
                  <p className="text-sm text-[#6b4a2b] mt-2 line-clamp-3" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                    {p.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e5d8bf]">
                  <Link
                    href="/podcasts"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4a1f24] hover:text-[#b45309] uppercase tracking-wider"
                    style={{ fontFamily: '"Cinzel", serif' }}
                  >
                    <span>Nghe Podcast 12</span>
                    <span>➔</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4 — MÔ PHỎNG SỰ KIỆN 2D LỚP 12
          ═══════════════════════════════════════════ */}
      <section ref={gameRef} className="max-w-6xl mx-auto px-4 py-8">
        <div className="game-showcase-box bg-gradient-to-r from-[#2c1216] via-[#4a1f24] to-[#2c1216] border-2 border-[#c9a15a] rounded-3xl p-8 text-[#f6e1ba] shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c9a15a]/20 border border-[#c9a15a]/40 text-[#f3ddb3] text-xs font-bold uppercase tracking-wider">
                <GamepadIcon className="w-4 h-4 text-[#e5b869]" />
                <span>GAME 2D MÔ PHỎNG SỰ KIỆN 12</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-extrabold text-white uppercase tracking-wide" style={{ fontFamily: '"Cinzel", serif' }}>
                Tái Hiện Các Chiến Dịch Lịch Sử Lớp 12
              </h2>
              <p className="text-base text-[#f6e1ba]/80 leading-relaxed" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                Học sinh trực tiếp trải nghiệm bản đồ 2D mô phỏng Chiến dịch Điện Biên Phủ 1954, Chiến dịch Hồ Chí Minh 1975 và làm bài trắc nghiệm tích lũy XP ôn thi THPT Quốc gia.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-[#18090b]/80 border border-[#c9a15a]/30 p-3 rounded-xl text-center">
                  <div className="text-xs font-bold text-[#c9a15a]" style={{ fontFamily: '"Cinzel", serif' }}>Mô Phỏng Trận Đánh</div>
                </div>
                <div className="bg-[#18090b]/80 border border-[#c9a15a]/30 p-3 rounded-xl text-center">
                  <div className="text-xs font-bold text-[#c9a15a]" style={{ fontFamily: '"Cinzel", serif' }}>Bản Đồ Tilemap 12</div>
                </div>
                <div className="bg-[#18090b]/80 border border-[#c9a15a]/30 p-3 rounded-xl text-center">
                  <div className="text-xs font-bold text-[#c9a15a]" style={{ fontFamily: '"Cinzel", serif' }}>Tích Điểm Ôn Thi</div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/podcasts"
                  className="inline-block px-8 py-3.5 rounded-xl bg-[#c9a15a] text-[#1a0f0a] font-bold text-sm uppercase tracking-wider shadow-lg hover:bg-[#e5b869] transition"
                  style={{ fontFamily: '"Cinzel", serif' }}
                >
                  Nghe Podcast 12 ➔
                </Link>
              </div>
            </div>

            <div className="relative w-full lg:w-96 h-64 rounded-2xl overflow-hidden border-2 border-[#c9a15a]/60 shadow-xl">
              <Image
                src="/images/dien_bien_phu.png"
                alt="2D Game Grade 12 Map"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="p-4 rounded-full bg-[#c9a15a]/90 text-[#1a0f0a] shadow-lg animate-pulse">
                  <GamepadIcon className="w-8 h-8" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 5 — PODCAST ÔN THI 12 & BẢNG VÀNG HỌC SINH
          ═══════════════════════════════════════════ */}
      <section ref={splitRef} className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Podcast Section */}
          <div className="split-left bg-[#fcf9f2] border-2 border-[#c9a15a]/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#e5d8bf] pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <HeadphonesIcon className="w-5 h-5 text-[#b45309]" />
                  <h3 className="font-bold text-lg text-[#4a1f24] uppercase tracking-wide" style={{ fontFamily: '"Cinzel", serif' }}>
                    PODCAST ÔN THI LỚP 12
                  </h3>
                </div>
                <Link href="/podcasts" className="text-xs font-bold text-[#b45309] hover:underline" style={{ fontFamily: '"Cinzel", serif' }}>
                  Tất cả ➔
                </Link>
              </div>

              <div className="space-y-4">
                {podcasts.map((p, idx) => (
                  <div
                    key={p._id || idx}
                    className="p-4 bg-white border border-[#e5d8bf] rounded-xl flex items-start justify-between gap-4 hover:border-[#c9a15a] hover:shadow-md transition duration-200"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4a1f24] text-[#f6e1ba] flex items-center justify-center text-xs font-bold shadow mt-0.5">
                        0{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-[#2c1a0e] leading-snug line-clamp-2" style={{ fontFamily: '"Cinzel", serif' }}>
                          {p.title}
                        </h4>
                        <span className="text-xs text-[#8c653a] mt-1.5 inline-block font-medium" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                          Thời lượng: {Math.floor((p.duration || 600) / 60)} phút • Ôn thi 12
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/podcasts"
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#2c1216] text-[#f6e1ba] hover:bg-[#4a1f24] text-xs font-bold border border-[#c9a15a]/50 shadow transition"
                      style={{ fontFamily: '"Cinzel", serif' }}
                    >
                      Nghe
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#e5d8bf] text-center">
              <Link href="/podcasts" className="text-xs font-bold text-[#4a1f24] uppercase tracking-wider hover:text-[#b45309] transition" style={{ fontFamily: '"Cinzel", serif' }}>
                Nghe podcast tổng ôn kiến thức 12 ➔
              </Link>
            </div>
          </div>

          {/* Right: Leaderboard Preview */}
          <div className="split-right bg-[#fcf9f2] border-2 border-[#c9a15a]/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#e5d8bf] pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5 text-[#d97706]" />
                  <h3 className="font-bold text-lg text-[#4a1f24] uppercase tracking-wide" style={{ fontFamily: '"Cinzel", serif' }}>
                    BẢNG VÀNG THI ĐUA 12
                  </h3>
                </div>
                <Link href="/leaderboard" className="text-xs font-bold text-[#b45309] hover:underline" style={{ fontFamily: '"Cinzel", serif' }}>
                  Xem tất cả ➔
                </Link>
              </div>

              <div className="space-y-4">
                {leaderboard.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-[#e5d8bf] rounded-xl flex items-center justify-between gap-4 hover:border-[#c9a15a] hover:shadow-md transition duration-200"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-lg font-extrabold text-xs flex items-center justify-center text-white shadow ${idx === 0 ? "bg-gradient-to-r from-[#d97706] to-[#b45309]" : idx === 1 ? "bg-gradient-to-r from-[#6b7280] to-[#4b5563]" : "bg-gradient-to-r from-[#c2410c] to-[#9a3412]"}`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-[#2c1a0e] truncate" style={{ fontFamily: '"Cinzel", serif' }}>{item.name}</h4>
                        <span className="text-xs text-[#8c653a] font-medium" style={{ fontFamily: '"Cormorant Garamond", serif' }}>Học sinh Lớp 12 xuất sắc</span>
                      </div>
                    </div>
                    <span className="flex-shrink-0 font-extrabold text-sm text-[#b45309] px-2.5 py-1 bg-[#f4ebd9] rounded-md border border-[#c9a15a]/30" style={{ fontFamily: '"Cinzel", serif' }}>
                      {item.xp?.toLocaleString() || 2000} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#e5d8bf] text-center">
              <Link href="/leaderboard" className="text-xs font-bold text-[#4a1f24] uppercase tracking-wider hover:text-[#b45309] transition" style={{ fontFamily: '"Cinzel", serif' }}>
                Xem xếp hạng thi đua Lớp 12 ➔
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 6 — BÀI HỌC LỊCH SỬ LỚP 12 TRỌNG TÂM
          ═══════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-8 pb-16">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#9a702e] uppercase tracking-widest" style={{ fontFamily: '"Cinzel", serif' }}>
            <BookOpenIcon className="w-4 h-4" />
            <span>KHO BÀI HỌC LỊCH SỬ LỚP 12</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-[#4a1f24] uppercase tracking-wide mt-1" style={{ fontFamily: '"Cinzel", serif' }}>
            BÀI HỌC 12 NỔI BẬT NÊN HỌC NGAY
          </h2>
          <div className="w-20 h-1 bg-[#c9a15a] mx-auto mt-2 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.slice(0, 6).map((l, idx) => (
            <div key={l._id || idx} className="bg-white border-2 border-[#e8dfcf] hover:border-[#c9a15a] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 group flex flex-col justify-between">
              <div>
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={l.img || "/images/dien_bien_phu.png"}
                    alt={l.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[#4a1f24] text-[#f6e1ba] text-[10px] font-bold uppercase px-2.5 py-1 rounded shadow" style={{ fontFamily: '"Cinzel", serif' }}>
                    {l.tag || "Lớp 12"}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-lg text-[#2c1a0e] group-hover:text-[#b45309] transition line-clamp-1" style={{ fontFamily: '"Cinzel", serif' }}>
                    {l.title}
                  </h3>
                  <p className="text-xs text-[#6b4a2b] mt-2 line-clamp-2" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                    {l.content || l.desc || "Ôn tập kiến thức Lịch Sử 12 cốt lõi chuẩn bộ giáo dục."}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2">
                <Link
                  href="/podcasts"
                  className="block w-full text-center py-2.5 rounded-xl bg-[#f4ebd9] text-[#4a1f24] font-bold text-xs uppercase tracking-wider hover:bg-[#c9a15a] hover:text-[#1a0f0a] transition"
                  style={{ fontFamily: '"Cinzel", serif' }}
                >
                  Nghe Podcast 12 ➔
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 7 — VIP CTA BANNER
          ═══════════════════════════════════════════ */}
      <section ref={ctaRef} className="max-w-6xl mx-auto px-4 pb-16">
        <div className="cta-box bg-gradient-to-r from-[#2c1216] via-[#4a1f24] to-[#2c1216] border-2 border-[#c9a15a] rounded-3xl p-8 md:p-12 text-center text-[#f6e1ba] shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-bold text-[#c9a15a] uppercase tracking-widest" style={{ fontFamily: '"Cinzel", serif' }}>
              NÂNG HẠNG TÀI KHOẢN SUVIET360
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#fff3db] uppercase tracking-wide leading-tight" style={{ fontFamily: '"Cinzel", serif' }}>
              Mở Khóa Toàn Bộ Bài Học & AI Trợ Lý Thông Minh
            </h2>
            <p className="text-sm md:text-base text-[#f6e1ba]/90 font-medium" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
              Hỏi đáp không giới hạn với AI Chatbot Lịch sử, giải đáp trắc nghiệm chi tiết và trải nghiệm trọn bộ tính năng cao cấp.
            </p>
            <div className="pt-4">
              <Link
                href="/subscription"
                className="inline-block px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#c9a15a] via-[#e5b869] to-[#9a702e] text-[#1a0f0a] font-bold text-sm uppercase tracking-wider shadow-xl hover:brightness-110 hover:scale-105 transition duration-200"
                style={{ fontFamily: '"Cinzel", serif' }}
              >
                Đăng Ký Gói VIP Ngay ➔
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
