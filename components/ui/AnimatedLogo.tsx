"use client";

import { useState } from "react";

// Using app color palette
const COLORS = ["#791D1E", "rgba(63, 89, 46, 0.5)", "#104B55", "#C4B7A6"]; // app-red, app-green/50, app-teal, app-taupe
const HOVER_COLOR = "#F8F6F3"; // app-cream
const HOVER_BG = "#4A2E59"; // app-plumb

// Animation duration for full color cycle (in seconds)
const CYCLE_DURATION = 8;

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

// Generate keyframes for smooth color cycling (stroke-based)
const generateKeyframes = (offset: number) => {
  const len = COLORS.length;
  return `
    @keyframes colorCycle${offset} {
      0% { stroke: ${COLORS[offset % len]}; }
      25% { stroke: ${COLORS[(offset + 1) % len]}; }
      50% { stroke: ${COLORS[(offset + 2) % len]}; }
      75% { stroke: ${COLORS[(offset + 3) % len]}; }
      100% { stroke: ${COLORS[offset % len]}; }
    }
  `;
};

export function AnimatedLogo({ size = "lg", className = "", hoverEffect = false }: AnimatedLogoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = SIZE_CONFIG[size];

  const showHoverState = hoverEffect && isHovered;
  const containerSize = config.svgSize + config.padding * 2;

  // Inject keyframes styles
  const keyframesStyle = `
    ${generateKeyframes(0)}
    ${generateKeyframes(1)}
    ${generateKeyframes(2)}
    ${generateKeyframes(3)}
  `;

  return (
    <div
      className={`flex flex-col items-center text-center ${className}`}
      onMouseEnter={() => hoverEffect && setIsHovered(true)}
      onMouseLeave={() => hoverEffect && setIsHovered(false)}
    >
      <style>{keyframesStyle}</style>
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
            stroke={showHoverState ? HOVER_COLOR : undefined}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              animation: showHoverState ? "none" : `colorCycle3 ${CYCLE_DURATION}s ease-in-out infinite`,
              stroke: showHoverState ? HOVER_COLOR : undefined,
            }}
          />
          {/* Middle C - opens left (backwards C shape) */}
          <path
            d="M30,30 A28,28 0 1 1 30,70"
            stroke={showHoverState ? HOVER_COLOR : undefined}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              animation: showHoverState ? "none" : `colorCycle2 ${CYCLE_DURATION}s ease-in-out infinite`,
              stroke: showHoverState ? HOVER_COLOR : undefined,
            }}
          />
          {/* Innermost C - opens right (normal C shape) */}
          <path
            d="M61,39 A16,16 0 1 0 61,61"
            stroke={showHoverState ? HOVER_COLOR : undefined}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              animation: showHoverState ? "none" : `colorCycle0 ${CYCLE_DURATION}s ease-in-out infinite`,
              stroke: showHoverState ? HOVER_COLOR : undefined,
            }}
          />
          {/* Center dot */}
          <circle
            cx="50"
            cy="50"
            r={config.strokeWidth * 0.4}
            strokeWidth={config.strokeWidth * 0.8}
            fill="none"
            style={{
              animation: showHoverState ? "none" : `colorCycle1 ${CYCLE_DURATION}s ease-in-out infinite`,
              stroke: showHoverState ? HOVER_COLOR : undefined,
            }}
          />
        </svg>
      </div>
    </div>
  );
}

export default AnimatedLogo;
