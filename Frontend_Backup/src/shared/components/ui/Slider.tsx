"use client";

import * as React from "react";
import { cn } from "@/shared/utils/utils";

interface SliderProps {
  value: number; // 0 to 100
  onChange: (value: number) => void;
  className?: string;
}

export function Slider({ value, onChange, className }: SliderProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleUpdate = React.useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const clickX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (clickX / width) * 100));
      onChange(percentage);
    },
    [onChange]
  );

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleUpdate(e.clientX);
    },
    [handleUpdate]
  );

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleUpdate(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleUpdate]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "relative w-full h-1 bg-white/10 rounded-full group cursor-pointer select-none py-1.5 flex items-center",
        className
      )}
    >
      <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full" />
      <div
        style={{ width: `${value}%` }}
        className="absolute left-0 h-1 bg-gradient-to-r from-[#4720ca] to-[#1ed760] rounded-full"
      />
      <div
        style={{ left: `${value}%` }}
        className={cn(
          "absolute -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full border border-white/20 shadow-md transition-opacity duration-150",
          isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      />
    </div>
  );
}
