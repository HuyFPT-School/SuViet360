"use client";

import { useEffect, useRef } from "react";

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  /** Animation variant: fade-up (default) | fade-left | fade-right | fade-scale | fade */
  variant?: "fade-up" | "fade-left" | "fade-right" | "fade-scale" | "fade";
  /** Delay in ms, e.g. 100, 200, 300 */
  delay?: number;
  /** Stagger children individually instead of animating as a group */
  stagger?: boolean;
}

export default function AnimateIn({
  children,
  className = "",
  variant = "fade-up",
  delay = 0,
  stagger = false,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (stagger) {
      // Apply animation to each direct child with staggered delay
      Array.from(el.children).forEach((child, i) => {
        const c = child as HTMLElement;
        c.classList.add("sv-animate", `sv-anim-${variant}`);
        c.style.transitionDelay = `${delay + i * 100}ms`;
      });

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            Array.from(el.children).forEach((child) => {
              child.classList.add("sv-visible");
            });
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }

    // Single element animation
    el.classList.add("sv-animate", `sv-anim-${variant}`);
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("sv-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, delay, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}