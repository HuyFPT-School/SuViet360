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
  {
    name: "Nguyễn Minh Huy",
    xp: 2385,
    avatar: "",
  },
  {
    name: "Lê Khánh Linh",
    xp: 2270,
    avatar: "",
  },
  {
    name: "Trần Anh Đức",
    xp: 2190,
    avatar: "",
  }
];

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const MOCK_PODCASTS = [
  {
    _id: "mock1",
    title: "Ký sự chiến dịch Điện Biên Phủ",
    duration: 720,
    level: "Medium",
  },
  {
    _id: "mock2",
    title: "Bí ẩn khu lăng mộ vua Trần",
    duration: 900,
    level: "Easy",
  }
];

const translateLevel = (level?: string) => {
  if (!level) return "";
  const mapping: Record<string, string> = {
    Easy: "Dễ",
    Medium: "Trung cấp",
    Hard: "Nâng cao",
    "Dễ": "Dễ",
    "Trung cấp": "Trung cấp",
    "Nâng cao": "Nâng cao"
  };
  return mapping[level] || level;
};

const getLessonProperties = (l: any, i: number) => {
  const fallbackImages = [
    "/images/hue_citadel.png",
    "/images/trung_sisters.png",
    "/images/bach_dang_battle.png",
    "/images/chi_lang.png",
    "/images/dien_bien_phu.png",
    "/images/thang_long.png",
    "/images/van_mieu.png"
  ];
  return {
    id: l._id || `lesson-${i}`,
    title: l.title,
    desc: l.content || l.desc || "Khám phá chi tiết bài học lịch sử đầy hào hùng.",
    tag: l.tag || "Bài học",
    img: l.img || fallbackImages[i % fallbackImages.length],
  };
};

/* ── STATIC DATA ── */
const ERAS = [
  {
    icon: "hung_vuong",
    name: "Hùng Vương",
    sub: "2879 TCN – 258 TCN",
    desc: "Thời kỳ dựng nước đầu tiên của dân tộc Việt Nam, mở đầu kỷ nguyên văn minh sông Hồng với truyền thuyết Thánh Gióng oai hùng và nền văn minh Đông Sơn rực rỡ.",
    color: "#c9a15a",
    img: "/images/thanh_giong_era.png",
    badges: ["Văn hóa", "Truyền thuyết", "Dựng nước"],
  },
  {
    icon: "dinh_le_ly_tran",
    name: "Đinh · Lê · Lý · Trần",
    sub: "968 – 1400",
    desc: "Kỷ nguyên phong kiến độc lập tự chủ cường thịnh, ghi dấu lịch sử hào hùng với ba lần đại phá quân Nguyên Mông và chiến thắng Bạch Đằng vang dội.",
    color: "#d4543a",
    img: "/images/bach_dang_battle.png",
    badges: ["Hào kiệt", "Chiến dịch", "Tự chủ"],
  },
  {
    icon: "le_nguyen",
    name: "Lê · Nguyễn",
    sub: "1428 – 1945",
    desc: "Kỷ nguyên mở mang bờ cõi rộng lớn về phương Nam, phục hưng văn hiến Đại Việt thời Hậu Lê và xây dựng quần thể cố đô Huế uy nghiêm thời nhà Nguyễn.",
    color: "#6b8e6b",
    img: "/images/hue_citadel.png",
    badges: ["Triều đại", "Di sản", "Cố đô"],
  },
  {
    icon: "hien_dai",
    name: "Hiện Đại",
    sub: "1945 – Nay",
    desc: "Kỷ nguyên đấu tranh giành độc lập dân tộc oai hùng từ Cách mạng tháng Tám, chiến dịch Điện Biên Phủ chấn động địa cầu đến thời kỳ Đổi mới hội nhập quốc tế.",
    color: "#4a7fb5",
    img: "/images/dien_bien_phu.png",
    badges: ["Cách mạng", "Hội nhập", "Độc lập"],
  },
];

const LESSONS = [
  {
    title: "Bí ẩn Cố đô Huế",
    tag: "Lịch sử",
    desc: "Khám phá kiến trúc cung đình và di sản văn hóa của triều Nguyễn.",
    img: "/images/hue_citadel.png",
  },
  {
    title: "Huyền thoại Hai Bà Trưng",
    tag: "Nhân vật",
    desc: "Cuộc khởi nghĩa đầu tiên chống ách đô hộ phương Bắc.",
    img: "/images/trung_sisters.png",
  },
  {
    title: "Chiến thắng Bạch Đằng",
    tag: "Chiến dịch",
    desc: "Trận thủy chiến lừng danh đánh bại quân Nam Hán năm 938.",
    img: "/images/bach_dang_battle.png",
  },
  {
    title: "Ải Chi Lăng hiểm trở",
    tag: "Ải địa",
    desc: "Nơi hiểm yếu ghi dấu trận chiến phục kích tiêu diệt Liễu Thăng.",
    img: "/images/chi_lang.png",
  },
  {
    title: "Chiến dịch Điện Biên Phủ",
    tag: "Chiến dịch",
    desc: "Chiến thắng vẻ vang lừng lẫy năm châu, chấn động địa cầu năm 1954.",
    img: "/images/dien_bien_phu.png",
  },
  {
    title: "Hoàng thành Thăng Long",
    tag: "Di tích",
    desc: "Trung tâm quyền lực hoàng gia kéo dài mười ba thế kỷ văn hiến.",
    img: "/images/thang_long.png",
  },
  {
    title: "Văn Miếu - Quốc Tử Giám",
    tag: "Di tích",
    desc: "Trường đại học đầu tiên của Việt Nam, biểu tượng hiếu học.",
    img: "/images/van_mieu.png",
  },
];

const STATS = [
  { value: "50+", label: "Bài học sử Việt" },
  { value: "120+", label: "Kỷ lục Bảng Vàng" },
  { value: "10+", label: "Podcast hào hùng" },
  { value: "2D", label: "Game ảo hóa" },
];

/* ── SVG ICON RENDERING HELPERS ── */
const renderEraIcon = (icon: string) => {
  switch (icon) {
    case "hung_vuong":
      return (
        <svg className="gsap-svg-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="50" cy="50" r="45" />
          <circle cx="50" cy="50" r="38" strokeDasharray="4 4" />
          <circle cx="50" cy="50" r="28" />
          <polygon points="50,34 53,44 63,44 55,50 58,60 50,54 42,60 45,50 37,44 47,44" fill="currentColor" />
          <path d="M50,5 L50,14 M50,86 L50,95 M5,50 L14,50 M86,50 L95,50" />
          <path d="M18,18 L25,25 M75,75 L82,82 M18,82 L25,75 M75,18 L82,25" />
        </svg>
      );
    case "dinh_le_ly_tran":
      return (
        <svg className="gsap-svg-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20,80 L75,25 M75,25 L80,20 M80,20 L85,25 M85,25 L80,30 M80,30 L25,85" />
          <path d="M15,85 L25,75 M12,88 L18,82 M10,90 L12,88" />
          <path d="M80,80 L25,25 M25,25 L20,20 M20,20 L15,25 M15,25 L20,30 M20,30 L75,85" />
          <path d="M85,85 L75,75 M88,88 L82,82 M90,90 L88,88" />
          <path d="M50,35 Q55,42 50,50 Q45,42 50,35 Z" fill="currentColor" opacity="0.3" />
          <circle cx="50" cy="50" r="8" />
        </svg>
      );
    case "le_nguyen":
      return (
        <svg className="gsap-svg-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="15" y="15" width="8" height="70" rx="3" />
          <rect x="77" y="15" width="8" height="70" rx="3" />
          <path d="M23,20 L77,20 M23,80 L77,80" />
          <path d="M30,32 L70,32 M30,42 L65,42 M30,52 L70,52 M30,62 L60,62 M30,72 L70,72" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M35,32 L65,32 M35,52 L60,52 M35,72 L65,72" strokeWidth="1.5" />
        </svg>
      );
    case "hien_dai":
      return (
        <svg className="gsap-svg-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20,90 L80,90 L75,80 L25,80 Z" />
          <path d="M30,80 L70,80 L66,70 L34,70 Z" />
          <path d="M38,70 L62,70 L59,50 L41,50 Z" />
          <path d="M44,50 L56,50 L54,25 L46,25 Z" />
          <rect x="43" y="18" width="14" height="7" rx="1" />
          <line x1="50" y1="18" x2="50" y2="4" />
          <path d="M50,4 L68,9 L50,14 Z" fill="currentColor" opacity="0.4" />
          <circle cx="50" cy="37" r="2" />
          <circle cx="50" cy="60" r="2" />
        </svg>
      );
    default:
      return null;
  }
};

export default function GsapHomePage() {
  const mainRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const heroCTARef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLElement>(null);
  const timelineLineRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLElement>(null);
  const horizontalInnerRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
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
          api.get("/lessons?limit=10"),
          api.get("/podcasts?limit=3"),
          api.get("/progress/leaderboard").catch(err => {
            console.error("Failed to fetch leaderboard, falling back:", err);
            return { data: { data: { leaderboard: MOCK_LEADERBOARD } } };
          })
        ]);
        
        const dbLessons = lessonsRes.data?.data || [];
        const publishedLessons = dbLessons.filter((l: any) => l.status === "Published");
        setLessons(publishedLessons.length > 0 ? publishedLessons : LESSONS);
        
        const dbPodcasts = podcastsRes.data?.data || [];
        const publishedPodcasts = dbPodcasts.filter((p: any) => p.status === "Published");
        setPodcasts(publishedPodcasts.length > 0 ? publishedPodcasts.slice(0, 3) : MOCK_PODCASTS.slice(0, 3));

        const rawLeaderboard = leaderboardRes.data?.data?.leaderboard || [];
        const formattedLeaderboard = rawLeaderboard.slice(0, 3).map((user: any) => ({
          name: user.name,
          xp: user.xp,
          avatar: user.avatar || "",
        }));
        setLeaderboard(formattedLeaderboard.length > 0 ? formattedLeaderboard : MOCK_LEADERBOARD);
      } catch (err) {
        console.error("Failed to load home page data:", err);
        setLessons(LESSONS);
        setPodcasts(MOCK_PODCASTS.slice(0, 3));
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
      /* ═══════════════════════════════════════════
         HERO — Cinematic entrance + parallax
         ═══════════════════════════════════════════ */
      const heroTl = gsap.timeline();

      // Title split text animation
      if (heroTitleRef.current) {
        const title = heroTitleRef.current;
        const words = title.querySelectorAll(".gsap-word");
        gsap.set(words, { y: 80, opacity: 0, rotateX: -40 });
        heroTl.to(words, {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1.2,
          stagger: 0.12,
          ease: "power3.out",
        });
      }

      // Subtitle
      if (heroSubRef.current) {
        gsap.set(heroSubRef.current, { y: 30, opacity: 0 });
        heroTl.to(
          heroSubRef.current,
          { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
          "-=0.5"
        );
      }

      // CTA buttons
      if (heroCTARef.current) {
        const btns = heroCTARef.current.children;
        gsap.set(btns, { y: 20, opacity: 0 });
        heroTl.to(
          btns,
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: "power2.out" },
          "-=0.3"
        );
      }

      // Hero parallax on scroll
      if (heroRef.current) {
        const heroImg = heroRef.current.querySelector(".gsap-hero-bg");
        if (heroImg) {
          gsap.to(heroImg, {
            yPercent: 25,
            scale: 1.1,
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: 1.5,
            },
          });
        }

        // Fade out hero text on scroll
        const heroContent = heroRef.current.querySelector(".gsap-hero-content");
        if (heroContent) {
          gsap.to(heroContent, {
            y: -60,
            opacity: 0,
            scrollTrigger: {
              trigger: heroRef.current,
              start: "20% top",
              end: "60% top",
              scrub: 1,
            },
          });
        }
      }

      /* ═══════════════════════════════════════════
         STATS — Counter animation
         ═══════════════════════════════════════════ */
      if (statsRef.current) {
        const statItems = statsRef.current.querySelectorAll(".gsap-stat-item");
        gsap.set(statItems, { y: 40, opacity: 0 });
        ScrollTrigger.create({
          trigger: statsRef.current,
          start: "top 80%",
          once: true,
          onEnter: () => {
            gsap.to(statItems, {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.15,
              ease: "power3.out",
            });
          },
        });
      }

      /* ═══════════════════════════════════════════
         TIMELINE — Scroll-drawn vertical line + cards
         ═══════════════════════════════════════════ */
      if (timelineRef.current && timelineLineRef.current) {
        // Draw the line progressively
        gsap.fromTo(
          timelineLineRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: timelineRef.current,
              start: "top 60%",
              end: "bottom 40%",
              scrub: 1.5,
            },
          }
        );

        // Cards slide in alternating
        const cards = timelineRef.current.querySelectorAll(".gsap-timeline-card");
        cards.forEach((card, i) => {
          const isLeft = i % 2 === 0;
          gsap.set(card, {
            x: isLeft ? -80 : 80,
            opacity: 0,
            rotateY: isLeft ? 8 : -8,
          });
          gsap.to(card, {
            x: 0,
            opacity: 1,
            rotateY: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 75%",
              end: "top 50%",
              toggleActions: "play none none reverse",
            },
          });
        });

        // Timeline dots pulse
        const dots = timelineRef.current.querySelectorAll(".gsap-timeline-dot");
        dots.forEach((dot) => {
          gsap.to(dot, {
            scale: 1.3,
            boxShadow: "0 0 20px rgba(201,161,90,0.6)",
            repeat: -1,
            yoyo: true,
            duration: 1.5,
            ease: "sine.inOut",
            scrollTrigger: {
              trigger: dot,
              start: "top 70%",
              toggleActions: "play pause resume pause",
            },
          });
        });
      }

      /* ═══════════════════════════════════════════
         HORIZONTAL SCROLL — Lessons section
         ═══════════════════════════════════════════ */
      if (horizontalRef.current && horizontalInnerRef.current) {
        const cards = horizontalInnerRef.current.querySelectorAll(".gsap-hscroll-card");
        const totalWidth = horizontalInnerRef.current.scrollWidth;
        const viewportWidth = window.innerWidth;

        // Only apply horizontal scroll on larger screens
        if (viewportWidth >= 768) {
          const hScroll = gsap.to(horizontalInnerRef.current, {
            x: -(totalWidth - viewportWidth + 200),
            ease: "none",
            scrollTrigger: {
              trigger: horizontalRef.current,
              start: "top top",
              end: () => `+=${totalWidth}`,
              scrub: 1.2,
              pin: true,
              anticipatePin: 1,
            },
          });

          // Stagger the cards for entrance
          cards.forEach((card, i) => {
            gsap.set(card, { opacity: 0.4, scale: 0.9, y: 0 });
            gsap.to(card, {
              opacity: 1,
              scale: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                containerAnimation: hScroll,
                start: "left 85%",
                end: "left 45%",
                scrub: true,
              },
            });
          });
        } else {
          // Mobile: simple stagger
          gsap.set(cards, { y: 40, opacity: 0 });
          ScrollTrigger.batch(cards, {
            start: "top 85%",
            onEnter: (batch) =>
              gsap.to(batch, {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: "power3.out",
              }),
          });
        }
      }

      /* ═══════════════════════════════════════════
         GAME 2D — Reveal & Tilt
         ═══════════════════════════════════════════ */
      const gameSection = mainRef.current?.querySelector(".gsap-game-section");
      const gameCard = mainRef.current?.querySelector(".gsap-game-card");
      if (gameSection && gameCard) {
        gsap.set(gameCard, { y: 60, opacity: 0, scale: 0.95 });
        gsap.to(gameCard, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gameSection,
            start: "top 75%",
          },
        });
      }

      /* ═══════════════════════════════════════════
         BẢNG VÀNG — Plaque Reveal & Row Cascade
         ═══════════════════════════════════════════ */
      const lbSection = mainRef.current?.querySelector(".gsap-leaderboard-section");
      const lbPlaque = mainRef.current?.querySelector(".gsap-leaderboard-plaque");
      const lbRows = mainRef.current?.querySelectorAll(".gsap-leaderboard-row");
      if (lbSection && lbPlaque) {
        gsap.set(lbPlaque, { y: 80, opacity: 0 });
        gsap.to(lbPlaque, {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: lbSection,
            start: "top 75%",
          },
        });

        if (lbRows && lbRows.length > 0) {
          gsap.set(lbRows, { x: -30, opacity: 0 });
          gsap.to(lbRows, {
            x: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
              trigger: lbPlaque,
              start: "top 60%",
            },
          });
        }
      }

      /* ═══════════════════════════════════════════
         PODCAST — Disk Rotation & Audio Wave Stagger
         ═══════════════════════════════════════════ */
      const podcastSection = mainRef.current?.querySelector(".gsap-podcast-section");
      const disk = mainRef.current?.querySelector(".gsap-podcast-disk");
      if (podcastSection && disk) {
        // Continuous rotation
        gsap.to(disk, {
          rotation: 360,
          duration: 25,
          repeat: -1,
          ease: "none",
        });

        // Entrance animation
        const visualPanel = podcastSection.querySelector(".gsap-podcast-visual-panel");
        const playlistPanel = podcastSection.querySelector(".gsap-podcast-playlist");
        if (visualPanel && playlistPanel) {
          gsap.set(visualPanel, { x: -60, opacity: 0 });
          gsap.set(playlistPanel, { x: 60, opacity: 0 });
          gsap.to(visualPanel, {
            x: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: podcastSection,
              start: "top 75%",
            },
          });
          gsap.to(playlistPanel, {
            x: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: podcastSection,
              start: "top 75%",
            },
          });
        }
      }

      /* ═══════════════════════════════════════════
         CTA BANNER — Scale zoom + glow
         ═══════════════════════════════════════════ */
      if (ctaRef.current) {
        const inner = ctaRef.current.querySelector(".gsap-cta-inner");
        if (inner) {
          gsap.set(inner, { scale: 0.85, opacity: 0 });
          gsap.to(inner, {
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ctaRef.current,
              start: "top 75%",
              end: "top 40%",
              scrub: 1,
            },
          });
        }

        // Glow pulse on CTA button
        const ctaBtn = ctaRef.current.querySelector(".gsap-cta-btn");
        if (ctaBtn) {
          gsap.to(ctaBtn, {
            boxShadow: "0 0 40px rgba(201,161,90,0.5), 0 0 80px rgba(201,161,90,0.2)",
            repeat: -1,
            yoyo: true,
            duration: 2,
            ease: "sine.inOut",
          });
        }
      }

      /* ═══════════════════════════════════════════
         FLOATING PARTICLES
         ═══════════════════════════════════════════ */
      const particles = mainRef.current?.querySelectorAll(".gsap-particle");
      particles?.forEach((p) => {
        const el = p as HTMLElement;
        gsap.to(el, {
          y: "random(-60, 60)",
          x: "random(-30, 30)",
          rotation: "random(-20, 20)",
          duration: "random(4, 8)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: "random(0, 3)",
        });
      });
    }, mainRef);

    return () => ctx.revert();
  }, [dataLoaded]);

  /* ── Render ── */
  return (
    <div ref={mainRef} className="gsap-homepage">
      {/* ═══════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════ */}
      <section ref={heroRef} className="gsap-hero">
        {/* Background */}
        <div className="gsap-hero-bg">
          <Image
            src="/images/HeroSection.png"
            alt="Phù điêu hành trình lịch sử Việt"
            fill
            priority
            className="object-cover object-[right_center]"
          />
        </div>

        {/* Gradient overlays */}
        <div className="gsap-hero-overlay gsap-hero-overlay-side" />
        <div className="gsap-hero-overlay gsap-hero-overlay-bottom" />
        <div className="gsap-hero-overlay gsap-hero-overlay-vignette" />

        {/* Floating particles */}
        {particlesReady &&
          Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="gsap-particle"
              style={{
                left: `${8 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 70}%`,
                fontSize: `${8 + Math.random() * 14}px`,
                opacity: 0.15 + Math.random() * 0.2,
              }}
            >
              {["✦", "◈", "❋", "✧", "◆", "❖"][i % 6]}
            </span>
          ))}

        {/* Hero content */}
        <div className="gsap-hero-content">
          <span className="gsap-hero-eyebrow">
            <span className="gsap-hero-eyebrow-line" />
            Hành Trình Khám Phá
            <span className="gsap-hero-eyebrow-line" />
          </span>

          <h1 ref={heroTitleRef} className="gsap-hero-title">
            <span className="gsap-word">Lịch</span>{" "}
            <span className="gsap-word">Sử</span>{" "}
            <span className="gsap-word gsap-word-accent">Việt</span>{" "}
            <span className="gsap-word gsap-word-accent">Nam</span>
          </h1>

          <p ref={heroSubRef} className="gsap-hero-subtitle">
            Khám phá hành trình nghìn năm văn hiến, từ thời Hùng Vương dựng nước
            đến công cuộc Đổi mới và hội nhập hiện đại.
          </p>

          <div ref={heroCTARef} className="gsap-hero-cta">
            <Link href="/register" className="gsap-btn-primary">
              <span>Bắt Đầu Ngay</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/podcasts" className="gsap-btn-secondary">
              Nghe Podcast
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="gsap-scroll-indicator">
            <span className="gsap-scroll-text">Cuộn xuống</span>
            <div className="gsap-scroll-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M5 11l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2 — STATS BAR
          ═══════════════════════════════════════════ */}
      <section ref={statsRef} className="gsap-stats">
        <div className="gsap-stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="gsap-stat-item">
              <span className="gsap-stat-value">{s.value}</span>
              <span className="gsap-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3 — TIMELINE
          ═══════════════════════════════════════════ */}
      <section ref={timelineRef} className="gsap-timeline-section">
        <div className="gsap-section-header">
          <span className="gsap-section-ornament">◈</span>
          <h2 className="gsap-section-title">Dòng Chảy Lịch Sử</h2>
          <span className="gsap-section-ornament">◈</span>
        </div>
        <p className="gsap-section-subtitle">
          Hành trình qua 4 giai đoạn quan trọng nhất trong lịch sử dân tộc
        </p>

        <div className="gsap-timeline-container">
          {/* Central line */}
          <div className="gsap-timeline-line-track">
            <div ref={timelineLineRef} className="gsap-timeline-line" />
          </div>

          {/* Timeline cards */}
          {ERAS.map((era, i) => (
            <div
              key={era.name}
              className={`gsap-timeline-card ${i % 2 === 0 ? "gsap-tl-left" : "gsap-tl-right"}`}
            >
              <div className="gsap-timeline-dot" style={{ borderColor: era.color }} />
              <div className="gsap-timeline-card-inner" style={{ borderTopColor: era.color }}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="gsap-timeline-icon-small" style={{ color: era.color }}>
                      {renderEraIcon(era.icon)}
                    </span>
                    <h3 className="gsap-timeline-card-title">{era.name}</h3>
                  </div>
                  <span className="gsap-timeline-card-badge-date" style={{ color: era.color, borderColor: `${era.color}40`, backgroundColor: `${era.color}10` }}>
                    {era.sub}
                  </span>
                </div>
                
                <p className="gsap-timeline-card-desc mb-4">{era.desc}</p>
                
                {/* Era Image */}
                {era.img && (
                  <div className="relative w-full h-48 sm:h-52 rounded-lg overflow-hidden border border-[#e8d5b5]/40 mb-4 shadow-sm">
                    <Image
                      src={era.img}
                      alt={era.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 450px"
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* Badges */}
                {era.badges && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {era.badges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                        style={{
                          backgroundColor: `${era.color}15`,
                          color: era.color,
                          border: `1px solid ${era.color}30`
                        }}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                <div className="border-t border-[#e8d5b5]/30 pt-3.5 flex justify-between items-center text-xs font-bold mt-2">
                  <Link href="/podcasts" className="hover:underline flex items-center gap-1 transition-colors" style={{ color: era.color }}>
                    Xem chi tiết
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4 — HORIZONTAL SCROLL LESSONS
          ═══════════════════════════════════════════ */}
      <section ref={horizontalRef} className="gsap-hscroll-section">
        <div className="gsap-hscroll-header">
          <span className="gsap-section-ornament">◈</span>
          <h2 className="gsap-section-title">Bài Học Nổi Bật</h2>
          <span className="gsap-section-ornament">◈</span>
        </div>

        <div ref={horizontalInnerRef} className="gsap-hscroll-inner">
          {lessons.map((lessonRaw, i) => {
            const l = getLessonProperties(lessonRaw, i);
            return (
              <Link key={l.id} href="/podcasts" className="gsap-hscroll-card">
                <div className="gsap-hscroll-card-visual">
                  <Image
                    src={l.img}
                    alt={l.title}
                    fill
                    sizes="340px"
                    className="object-cover transition-transform duration-700 ease-out gsap-hscroll-img"
                  />
                  <div className="gsap-hscroll-card-overlay" />
                  <span className="gsap-hscroll-card-tag">{l.tag}</span>
                </div>
                <div className="gsap-hscroll-card-body">
                  <h3>{l.title}</h3>
                  <p>{l.desc}</p>
                  <span className="gsap-hscroll-card-cta">
                    Khám phá →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 5 — GAME SỬ VIỆT 2D
          ═══════════════════════════════════════════ */}
      <section className="gsap-game-section">
        <div className="gsap-section-header">
          <span className="gsap-section-ornament">◈</span>
          <h2 className="gsap-section-title">Chiến Trường Ảo Hóa 2D</h2>
          <span className="gsap-section-ornament">◈</span>
        </div>
        <p className="gsap-section-subtitle">
          Nhập vai vào các nhân vật sử Việt, trực tiếp trải nghiệm các trận đánh lịch sử oai hùng
        </p>

        <div className="gsap-game-container">
          <div className="gsap-game-card">
            {/* Simulation of retro game */}
            <div className="gsap-game-screen">
              <Image
                src="/images/game_battlefield_v2.jpg"
                alt="Chiến Trường Ảo Hóa 2D"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 480px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="gsap-game-content-panel">
              <span className="gsap-game-tag">Phaser 2D Game Engine</span>
              <h3>Nhập Vai Anh Hùng - Tái Hiện Lịch Sử</h3>
              <p>
                Trực tiếp điều khiển nhân vật di chuyển qua các bản đồ thành trì cổ Việt Nam,
                vượt qua thử thách và trả lời các câu hỏi lịch sử để mở khóa các mốc thời gian vinh quang.
              </p>
              <Link href="#" className="gsap-btn-primary pointer-events-none opacity-60">
                <span>Chơi trên Mobile</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 6 — BẢNG VÀNG DANH VỌNG
          ═══════════════════════════════════════════ */}
      <section className="gsap-leaderboard-section">
        <div className="gsap-section-header">
          <span className="gsap-section-ornament">◈</span>
          <h2 className="gsap-section-title">Bảng Vàng Danh Vọng</h2>
          <span className="gsap-section-ornament">◈</span>
        </div>
        <p className="gsap-section-subtitle">
          Vinh danh những học giả lịch sử xuất sắc dẫn đầu bảng xếp hạng SuViet360
        </p>

        <div className="gsap-leaderboard-container">
          <div className="gsap-leaderboard-plaque">
            {/* Plaque Header */}
            <div className="gsap-plaque-ornament">
              <svg viewBox="0 0 200 40" fill="none" className="gsap-ornament-svg">
                <path d="M10,20 Q100,-10 190,20 M20,20 Q100,5 180,20" stroke="#c9a15a" strokeWidth="1.5" />
                <circle cx="100" cy="20" r="6" fill="#c9a15a" />
              </svg>
            </div>

            <h3 className="gsap-plaque-title">DANH SÁCH ĐẦU BẢNG</h3>

            <div className="gsap-leaderboard-rows">
              {leaderboard.map((item, idx) => {
                const rankClass = idx === 0 ? "gsap-rank-1" : idx === 1 ? "gsap-rank-2" : "gsap-rank-3";
                const medalClass = idx === 0 ? "gold" : idx === 1 ? "silver" : "bronze";
                return (
                  <div key={item.name + idx} className={`gsap-leaderboard-row ${rankClass}`}>
                    <div className="gsap-row-rank">
                      <span className={`gsap-medal ${medalClass}`}>{idx + 1}</span>
                    </div>
                    <div className="gsap-row-avatar">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        getInitials(item.name)
                      )}
                    </div>
                    <div className="gsap-row-info">
                      <span className="gsap-row-name">{item.name}</span>
                      <span className="gsap-row-region">Học sinh</span>
                    </div>
                    <div className="gsap-row-stats">
                      <span className="gsap-row-score">{item.xp.toLocaleString()} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="gsap-leaderboard-actions">
              <Link href="/leaderboard" className="gsap-btn-secondary">
                Xem Bảng Vàng Toàn Bộ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 7 — PODCAST SỬ KÝ
          ═══════════════════════════════════════════ */}
      <section className="gsap-podcast-section">
        <div className="gsap-section-header">
          <span className="gsap-section-ornament">◈</span>
          <h2 className="gsap-section-title">Podcast Sử Ký</h2>
          <span className="gsap-section-ornament">◈</span>
        </div>
        <p className="gsap-section-subtitle">
          Lắng nghe những câu chuyện sử hào hùng truyền cảm qua các số phát thanh truyền kỳ
        </p>

        <div className="gsap-podcast-container">
          {/* Left: Disk */}
          <div className="gsap-podcast-visual-panel">
            <div className="gsap-podcast-disk-wrapper">
              <div className="gsap-podcast-disk">
                <svg viewBox="0 0 100 100" className="gsap-disk-svg">
                  <circle cx="50" cy="50" r="48" fill="#160805" stroke="#c9a15a" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="44" stroke="#c9a15a" strokeWidth="0.75" strokeDasharray="2 1" />
                  <circle cx="50" cy="50" r="30" stroke="#c9a15a" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="10" fill="#c9a15a" />
                  <polygon points="50,42 52,48 58,48 53,51 55,57 50,54 45,57 47,51 42,48 48,48" fill="#160805" />
                  <path d="M50,15 A35,35 0 1,1 49.9,15" fill="none" stroke="#c9a15a" strokeWidth="1" strokeDasharray="3 4" />
                </svg>
                <div className="gsap-disk-center" />
              </div>
              <div className="gsap-podcast-needle">
                <svg viewBox="0 0 40 80" className="gsap-needle-svg">
                  <path d="M10,10 L30,10 L25,45 L15,55 L15,75" stroke="#a07930" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <circle cx="10" cy="10" r="4" fill="#c9a15a" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right: Playlist */}
          <div className="gsap-podcast-playlist">
            <span className="gsap-podcast-tag">Bản tin âm thanh</span>
            <h3>Số Phát Sóng Mới Nhất</h3>
            
            <div className="gsap-podcast-tracks">
              {podcasts.map((p, idx) => (
                <Link key={p._id} href={p._id.startsWith("mock") ? "/podcasts" : `/podcasts/${p._id}`} className="gsap-podcast-track">
                  <div className="gsap-track-play">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <polygon points="8,5 19,12 8,19" />
                    </svg>
                  </div>
                  <div className="gsap-track-info">
                    <h4>{p.title}</h4>
                    <p>Số {(idx + 1).toString().padStart(2, '0')} • Thời lượng: {Math.round(p.duration / 60) || 1} phút • Trình độ: {translateLevel(p.level)}</p>
                  </div>
                  <div className="gsap-track-wave">
                    <span /><span /><span /><span />
                  </div>
                </Link>
              ))}
            </div>

            <div className="gsap-podcast-actions">
              <Link href="/podcasts" className="gsap-btn-primary">
                <span>Nghe Trọn Bộ</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 6 — CTA BANNER
          ═══════════════════════════════════════════ */}
      <section ref={ctaRef} className="gsap-cta-section">
        <div className="gsap-cta-inner">
          <span className="gsap-cta-ornament gsap-cta-ornament-tl" aria-hidden>✦</span>
          <span className="gsap-cta-ornament gsap-cta-ornament-tr" aria-hidden>✦</span>
          <span className="gsap-cta-ornament gsap-cta-ornament-bl" aria-hidden>✦</span>
          <span className="gsap-cta-ornament gsap-cta-ornament-br" aria-hidden>✦</span>

          <p className="gsap-cta-eyebrow">Ưu Đãi Độc Quyền</p>
          <h2 className="gsap-cta-title">Đăng Ký Thành Viên Ngay!</h2>
          <p className="gsap-cta-sub">
            Nhận quyền truy cập đầy đủ vào tất cả bài học, game tương tác,
            podcast lịch sử và nhiều tài liệu độc quyền khác.
          </p>
          <Link href="/register" className="gsap-cta-btn">
            Đăng Ký Miễn Phí
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
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
