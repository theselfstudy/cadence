"use client";

import { useEffect, useState } from "react";

// Using app color palette
const COLORS = ["#791D1E", "#3F592E", "#104B55", "#C4B7A6"]; // app-red, app-green, app-teal, app-taupe
const HOVER_COLOR = "#F8F6F3"; // app-cream
const HOVER_BG = "#4A2E59"; // app-plumb

type LogoSize = "sm" | "md" | "lg";

interface AnimatedLogoProps {
  size?: LogoSize;
  className?: string;
  hoverEffect?: boolean;
}

const SIZE_CONFIG = {
  sm: {
    svgSize: 32,
    strokeWidth: 2.5,
    padding: 4,
  },
  md: {
    svgSize: 64,
    strokeWidth: 4,
    padding: 8,
  },
  lg: {
    svgSize: 100,
    strokeWidth: 6,
    padding: 12,
  },
};

export function AnimatedLogo({ size = "lg", className = "", hoverEffect = false }: AnimatedLogoProps) {
  const [colorIndex, setColorIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const config = SIZE_CONFIG[size];

  // Cycle colors every 2s (only when not hovered)
  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setColorIndex((i) => (i + 1) % COLORS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isHovered]);

  // Determine colors for the 3 Cs
  const showHoverState = hoverEffect && isHovered;
  const innerColor = showHoverState ? HOVER_COLOR : COLORS[colorIndex];
  const middleColor = showHoverState ? HOVER_COLOR : COLORS[(colorIndex + 1) % COLORS.length];
  const outerColor = showHoverState ? HOVER_COLOR : COLORS[(colorIndex + 2) % COLORS.length];

  const containerSize = config.svgSize + config.padding * 2;

  return (
    <div
      className={`flex flex-col items-center text-center ${className}`}
      onMouseEnter={() => hoverEffect && setIsHovered(true)}
      onMouseLeave={() => hoverEffect && setIsHovered(false)}
    >
      {/* Container with optional background */}
      <div
        className="rounded-full flex items-center justify-center transition-colors duration-300"
        style={{
          width: containerSize,
          height: containerSize,
          backgroundColor: showHoverState ? HOVER_BG : "transparent",
        }}
      >
        {/* Concentric C Shapes SVG */}
        <svg
          width={config.svgSize}
          height={config.svgSize}
          viewBox="0 0 100 100"
          className="relative"
        >
          {/* Outermost C - opens right (normal C shape) */}
          <path
            d="M78,22 A40,40 0 1 0 78,78"
            stroke={outerColor}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            className="transition-colors duration-300"
          />
          {/* Middle C - opens left (backwards C shape) */}
          <path
            d="M30,30 A28,28 0 1 1 30,70"
            stroke={middleColor}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            className="transition-colors duration-300"
          />
          {/* Innermost C - opens right (normal C shape) */}
          <path
            d="M61,39 A16,16 0 1 0 61,61"
            stroke={innerColor}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            className="transition-colors duration-300"
          />
        </svg>
      </div>
    </div>
  );
}

export default AnimatedLogo;
