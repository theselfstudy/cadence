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
    strokeWidth: 3.75,
    padding: 4,
    heartOrigin: "50px 50px", // Adjust these values to center the sm heart
  },
  md: {
    svgSize: 64,
    strokeWidth: 4,
    padding: 8,
    heartOrigin: "49px 52px",
  },
  lg: {
    svgSize: 100,
    strokeWidth: 6,
    padding: 12,
    heartOrigin: "49px 52px",
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

// Generate keyframes for smooth color cycling (fill-based for heart)
const generateFillKeyframes = (offset: number) => {
  const len = COLORS.length;
  return `
    @keyframes fillCycle${offset} {
      0% { fill: ${COLORS[offset % len]}; }
      25% { fill: ${COLORS[(offset + 1) % len]}; }
      50% { fill: ${COLORS[(offset + 2) % len]}; }
      75% { fill: ${COLORS[(offset + 3) % len]}; }
      100% { fill: ${COLORS[offset % len]}; }
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
    ${generateFillKeyframes(1)}
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
          {/* Center heart */}
          <path
            d="M50,56 C50,56 44,50 44,47 C44,44 46,42 50,46 C54,42 56,44 56,47 C56,50 50,56 50,56 Z"
            transform={`scale(${config.strokeWidth / 9})`}
            style={{
              transformOrigin: config.heartOrigin,
              animation: showHoverState ? "none" : `fillCycle1 ${CYCLE_DURATION}s ease-in-out infinite`,
              fill: showHoverState ? HOVER_COLOR : undefined,
            }}
          />
        </svg>
      </div>
    </div>
  );
}

export default AnimatedLogo;
