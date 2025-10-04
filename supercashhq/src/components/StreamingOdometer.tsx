import { useState, useEffect, useCallback, useRef } from "react";

interface StreamingOdometerProps {
  // The initial value to display and start animating from.
  value: number;
  // The amount the value should increase per second.
  streamingRate?: number;
  // The absolute maximum value the odometer should reach.
  maxValue?: number;
  // Controls whether the animation is running.
  isAnimating?: boolean;
  // Visual props
  decimals?: number;
  tokenSymbol?: string;
  size?: "sm" | "md" | "lg";
}

export function StreamingOdometer({
  value,
  streamingRate = 0,
  maxValue = Infinity,
  isAnimating = false,
  decimals = 8,
  tokenSymbol = "",
  size = "md",
}: StreamingOdometerProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationFrameId = useRef<number>();

  // This is the core animation hook. It runs only when `isAnimating` is true.
  useEffect(() => {
    // Do not run the animation if it's not supposed to be active.
    if (!isAnimating || streamingRate <= 0) {
      setDisplayValue(value); // Ensure it displays the final correct value when stopped.
      return;
    }

    let lastUpdateTime = performance.now();
    let accumulatedValue = value; // Start the animation from the last known value.

    const animate = (currentTime: number) => {
      const deltaTimeMs = currentTime - lastUpdateTime;
      lastUpdateTime = currentTime;

      const increment = (streamingRate * deltaTimeMs) / 1000;
      accumulatedValue += increment;

      // Ensure the display value does not exceed the maximum value.
      if (accumulatedValue >= maxValue) {
        setDisplayValue(maxValue);
        return; // Stop the animation.
      }

      setDisplayValue(accumulatedValue);

      // Continue the animation on the next frame.
      animationFrameId.current = requestAnimationFrame(animate);
    };

    // Start the animation loop.
    animationFrameId.current = requestAnimationFrame(animate);

    // Cleanup function: This is crucial to prevent memory leaks.
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
    // The dependency array is key: it restarts the animation if any of these props change.
  }, [isAnimating, value, streamingRate, maxValue]);

  // Format the display value for rendering.
  const formattedValue = displayValue.toFixed(decimals);
  const [integerPart, decimalPart] = formattedValue.split(".");

  // Determine font sizes based on the size prop
  const getFontSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-2xl";
      case "lg":
        return "text-5xl";
      case "md":
      default:
        return "text-4xl";
    }
  };

  const getDecimalFontSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-xl";
      case "lg":
        return "text-4xl";
      case "md":
      default:
        return "text-3xl";
    }
  };

  return (
    <div
      className={`flex items-baseline font-mono font-bold ${getFontSizeClasses()}`}
    >
      <span className="tracking-tight">{integerPart}</span>
      {decimals > 0 && (
        <span className={`${getDecimalFontSizeClasses()} opacity-80`}>
          .{decimalPart}
        </span>
      )}
      {tokenSymbol && (
        <span className={`ml-1 opacity-70 ${getDecimalFontSizeClasses()}`}>
          {tokenSymbol}
        </span>
      )}
      {/* Visual indicator for active streaming */}
      {isAnimating && (
        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
      )}
    </div>
  );
}
