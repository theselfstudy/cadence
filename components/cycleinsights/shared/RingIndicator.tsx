// /components/cycleinsights/shared/RingIndicator.tsx
"use client";

import { useMemo } from "react";

// ============================================
// RING INDICATOR
// Visual arc/ring showing a ratio (e.g., 5 of 7 cycles)
// Used throughout Cycle Insights for consistency indicators
// ============================================

interface RingIndicatorProps {
  /** Current value (numerator) */
  value: number;
  
  /** Maximum value (denominator) */
  max: number;
  
  /** Size variant - affects overall dimensions */
  size?: "sm" | "md" | "lg";
  
  /** Color theme for the filled arc */
  color?: "red" | "teal" | "green" | "gray";
  
  /** Whether to show the "X of Y" label */
  showLabel?: boolean;
  
  /** Label position relative to ring */
  labelPosition?: "bottom" | "right" | "inside";
  
  /** Optional custom label text (overrides default "X of Y") */
  customLabel?: string;
  
  /** Optional className for container */
  className?: string;
  
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

export function RingIndicator({
  value,
  max,
  size = "md",
  color = "teal",
  showLabel = true,
  labelPosition = "right",
  customLabel,
  className = "",
  ariaLabel,
}: RingIndicatorProps) {
  // ============================================
  // SIZE CONFIGURATIONS
  // ============================================
  
  const sizeConfig = useMemo(() => {
    switch (size) {
      case "sm":
        return {
          dimension: 36,      // SVG width/height
          strokeWidth: 4,     // Thickness of the ring
          fontSize: "text-xs",
          labelGap: "gap-1.5",
        };
      case "md":
        return {
          dimension: 48,
          strokeWidth: 5,
          fontSize: "text-sm",
          labelGap: "gap-2",
        };
      case "lg":
        return {
          dimension: 64,
          strokeWidth: 6,
          fontSize: "text-base",
          labelGap: "gap-3",
        };
    }
  }, [size]);

  // ============================================
  // COLOR CONFIGURATIONS
  // ============================================
  
  const colorConfig = useMemo(() => {
    switch (color) {
      case "red":
        return {
          filled: "#791D1E",      // app-red
          unfilled: "#791D1E20",  // app-red with low opacity
          text: "text-app-red",
        };
      case "teal":
        return {
          filled: "#104B55",      // app-teal
          unfilled: "#104B5520",  // app-teal with low opacity
          text: "text-app-teal",
        };
      case "green":
        return {
          filled: "#3F592E",      // app-green
          unfilled: "#3F592E20",  // app-green with low opacity
          text: "text-app-green",
        };
      case "gray":
        return {
          filled: "#7A7A7A",      // app-gray
          unfilled: "#7A7A7A20",  // app-gray with low opacity
          text: "text-app-gray",
        };
    }
  }, [color]);

  // ============================================
  // RING CALCULATIONS
  // ============================================
  
  const ringCalcs = useMemo(() => {
    const { dimension, strokeWidth } = sizeConfig;
    
    // Center point of the SVG
    const center = dimension / 2;
    
    // Radius accounts for stroke width to prevent clipping
    const radius = (dimension - strokeWidth) / 2;
    
    // Circumference of the circle
    const circumference = 2 * Math.PI * radius;
    
    // Calculate the filled portion
    // Clamp value between 0 and max to prevent overflow
    const clampedValue = Math.max(0, Math.min(value, max));
    const ratio = max > 0 ? clampedValue / max : 0;
    
    // stroke-dashoffset determines how much of the stroke is hidden
    // We start from the top (-90 degree rotation) and go clockwise
    const filledLength = circumference * ratio;
    const unfilledOffset = circumference - filledLength;
    
    return {
      center,
      radius,
      circumference,
      unfilledOffset,
      ratio,
      percentage: Math.round(ratio * 100),
    };
  }, [value, max, sizeConfig]);

  // ============================================
  // LABEL TEXT
  // ============================================
  
  const labelText = customLabel ?? `${value} of ${max}`;
  const screenReaderLabel = ariaLabel ?? `${value} of ${max} cycles, ${ringCalcs.percentage}%`;

  // ============================================
  // RENDER HELPERS
  // ============================================
  
  const renderRing = () => (
    <svg
      width={sizeConfig.dimension}
      height={sizeConfig.dimension}
      viewBox={`0 0 ${sizeConfig.dimension} ${sizeConfig.dimension}`}
      className="transform -rotate-90"
      aria-hidden="true"
    >
      {/* Background ring (unfilled portion) */}
      <circle
        cx={ringCalcs.center}
        cy={ringCalcs.center}
        r={ringCalcs.radius}
        fill="none"
        stroke={colorConfig.unfilled}
        strokeWidth={sizeConfig.strokeWidth}
        strokeLinecap="round"
      />
      
      {/* Foreground ring (filled portion) */}
      {ringCalcs.ratio > 0 && (
        <circle
          cx={ringCalcs.center}
          cy={ringCalcs.center}
          r={ringCalcs.radius}
          fill="none"
          stroke={colorConfig.filled}
          strokeWidth={sizeConfig.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={ringCalcs.circumference}
          strokeDashoffset={ringCalcs.unfilledOffset}
          className="transition-all duration-500 ease-out"
        />
      )}
    </svg>
  );

  const renderLabel = () => (
    <span className={`${sizeConfig.fontSize} font-medium ${colorConfig.text}`}>
      {labelText}
    </span>
  );

  // ============================================
  // LAYOUT VARIANTS
  // ============================================
  
  // Inside label (percentage shown in center of ring)
  if (labelPosition === "inside") {
    return (
      <div 
        className={`relative inline-flex items-center justify-center ${className}`}
        role="img"
        aria-label={screenReaderLabel}
      >
        {renderRing()}
        
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`${size === "lg" ? "text-sm" : "text-xs"} font-bold ${colorConfig.text}`}>
              {ringCalcs.percentage}%
            </span>
          </div>
        )}
      </div>
    );
  }

  // Bottom label
  if (labelPosition === "bottom") {
    return (
      <div 
        className={`inline-flex flex-col items-center gap-1 ${className}`}
        role="img"
        aria-label={screenReaderLabel}
      >
        {renderRing()}
        {showLabel && renderLabel()}
      </div>
    );
  }

  // Right label (default)
  return (
    <div 
      className={`inline-flex items-center ${sizeConfig.labelGap} ${className}`}
      role="img"
      aria-label={screenReaderLabel}
    >
      {renderRing()}
      {showLabel && renderLabel()}
    </div>
  );
}

// ============================================
// COMPACT VARIANT
// Smaller ring with inline label, good for lists
// ============================================

interface CompactRingProps {
  value: number;
  max: number;
  color?: "red" | "teal" | "green" | "gray";
  className?: string;
}

export function CompactRing({
  value,
  max,
  color = "teal",
  className = "",
}: CompactRingProps) {
  return (
    <RingIndicator
      value={value}
      max={max}
      size="sm"
      color={color}
      showLabel={true}
      labelPosition="right"
      className={className}
    />
  );
}

// ============================================
// CONSISTENCY RING
// Pre-configured for showing pattern consistency
// Automatically chooses color based on ratio
// ============================================

interface ConsistencyRingProps {
  /** Number of cycles where pattern appeared */
  cyclesPresent: number;
  
  /** Total number of cycles tracked */
  totalCycles: number;
  
  /** Whether this is a period-related pattern (uses red) */
  isPeriodRelated?: boolean;
  
  /** Size variant */
  size?: "sm" | "md" | "lg";
  
  /** Label position */
  labelPosition?: "bottom" | "right" | "inside";
  
  /** Optional className */
  className?: string;
}

export function ConsistencyRing({
  cyclesPresent,
  totalCycles,
  isPeriodRelated = false,
  size = "md",
  labelPosition = "right",
  className = "",
}: ConsistencyRingProps) {
  // Determine color based on pattern type
  const color = isPeriodRelated ? "red" : "teal";
  
  // Build descriptive label
  const label = `${cyclesPresent} of ${totalCycles} cycle${totalCycles !== 1 ? "s" : ""}`;
  
  return (
    <RingIndicator
      value={cyclesPresent}
      max={totalCycles}
      size={size}
      color={color}
      showLabel={true}
      labelPosition={labelPosition}
      customLabel={label}
      className={className}
      ariaLabel={`Pattern appeared in ${cyclesPresent} of ${totalCycles} cycles`}
    />
  );
}

// ============================================
// CYCLE PROGRESS RING
// Shows progress through current cycle
// Used in "This Cycle" section
// ============================================

interface CycleProgressRingProps {
  /** Current day of cycle */
  currentDay: number;
  
  /** Estimated cycle length (or average) */
  estimatedLength: number;
  
  /** Size variant */
  size?: "sm" | "md" | "lg";
  
  /** Optional className */
  className?: string;
}

export function CycleProgressRing({
  currentDay,
  estimatedLength,
  size = "lg",
  className = "",
}: CycleProgressRingProps) {
  // Calculate progress, capping at 100%
  const progress = Math.min(currentDay, estimatedLength);
  
  // Determine color based on where in cycle
  // Red when likely in menstrual phase (first ~5 days)
  // Teal otherwise
  const color = currentDay <= 5 ? "red" : "teal";
  
  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="relative">
        <RingIndicator
          value={progress}
          max={estimatedLength}
          size={size}
          color={color}
          showLabel={false}
          className=""
        />
        
        {/* Day number in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-bold ${color === "red" ? "text-app-red" : "text-app-teal"}`}>
            {currentDay}
          </span>
          <span className="text-xs text-app-gray">
            day
          </span>
        </div>
      </div>
      
      {/* Estimated length note */}
      <span className="text-xs text-app-gray">
        of ~{estimatedLength} days
      </span>
    </div>
  );
}