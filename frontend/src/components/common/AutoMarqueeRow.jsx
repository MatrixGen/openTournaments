import React, { useEffect, useMemo, useRef, useState } from "react";

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
};

const AutoMarqueeRow = ({
  items,
  renderItem,
  className = "",
  gapClass = "gap-3",
  speedSeconds = 18, // lower = faster
  resumeDelayMs = 1200,
}) => {
  const prefersReduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef(null);

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const shouldAnimate = safeItems.length > 0 && !prefersReduced;

  const pauseNow = () => {
    if (!shouldAnimate) return;
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };

  const pauseThenResume = () => {
    if (!shouldAnimate) return;
    pauseNow();
    resumeTimer.current = setTimeout(() => setPaused(false), resumeDelayMs);
  };

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  if (!safeItems.length) return null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={pauseNow}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={pauseNow}
      onPointerUp={pauseThenResume}
      onWheel={pauseThenResume}
      onTouchStart={pauseNow}
      onTouchEnd={pauseThenResume}
    >
      {/* Manual scroll layer (user can interrupt by scrolling/dragging) */}
      <div
        className="overflow-x-auto no-scrollbar"
        onScroll={pauseThenResume}
      >
        {/* The animated track */}
        <div
          className={`flex ${gapClass} w-max py-0.5`}
          style={
            shouldAnimate
              ? {
                  animation: `marquee-left ${speedSeconds}s linear infinite`,
                  animationPlayState: paused ? "paused" : "running",
                }
              : undefined
          }
        >
          {/* First set */}
          {safeItems.map((it, idx) => (
            <React.Fragment key={`a-${it?.id ?? idx}`}>
              {renderItem(it)}
            </React.Fragment>
          ))}

          {/* Duplicate set for seamless loop */}
          {safeItems.map((it, idx) => (
            <React.Fragment key={`b-${it?.id ?? idx}`}>
              {renderItem(it)}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default AutoMarqueeRow;
