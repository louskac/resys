"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  className?: string;
  children: React.ReactNode;
  animation?: "fade-in" | "fade-up" | "fade-down" | "fade-left" | "fade-right" | "zoom-in";
  duration?: number; // in milliseconds
  delay?: number; // in milliseconds
  threshold?: number; // intersection observer threshold
}

export default function ScrollReveal({
  className = "",
  children,
  animation = "fade-up",
  duration = 800,
  delay = 0,
  threshold = 0.1,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable reveal animation if user prefers reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing (one-shot reveal)
          if (elementRef.current) {
            observer.unobserve(elementRef.current);
          }
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -50px 0px", // Trigger slightly before it enters fully
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [threshold]);

  const getInitialTransform = () => {
    switch (animation) {
      case "fade-up":
        return "translate3d(0, 30px, 0)";
      case "fade-down":
        return "translate3d(0, -30px, 0)";
      case "fade-left":
        return "translate3d(30px, 0, 0)";
      case "fade-right":
        return "translate3d(-30px, 0, 0)";
      case "zoom-in":
        return "scale3d(0.95, 0.95, 1)";
      case "fade-in":
      default:
        return "none";
    }
  };

  const initialStyles: React.CSSProperties = {
    opacity: 0,
    transform: getInitialTransform(),
    transitionProperty: "opacity, transform",
    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)", // Premium spring-like ease-out curve
    transitionDuration: `${duration}ms`,
    transitionDelay: `${delay}ms`,
    willChange: "transform, opacity",
  };

  const activeStyles: React.CSSProperties = {
    opacity: 1,
    transform: "translate3d(0, 0, 0) scale3d(1, 1, 1)",
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={isVisible ? activeStyles : initialStyles}
    >
      {children}
    </div>
  );
}
