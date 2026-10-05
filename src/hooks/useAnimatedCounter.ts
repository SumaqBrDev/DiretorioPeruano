import { useState, useEffect, useRef } from 'react';

interface UseAnimatedCounterOptions {
  end: number;
  duration?: number;
  suffix?: string;
}

export function useAnimatedCounter({ end, duration = 2000, suffix = '' }: UseAnimatedCounterOptions) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  // Tracks the target already animated. Stats arrive asynchronously, so the
  // element is frequently in view with end=0 before the fetch resolves; a
  // one-shot "hasAnimated" flag locked the counter at zero forever and the
  // homepage advertised 0 businesses while listing several below.
  const animatedTo = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const run = () => {
      if (animatedTo.current === end) return;
      animatedTo.current = end;

      if (frame.current !== null) cancelAnimationFrame(frame.current);

      const from = 0;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(from + easeOut * (end - from)));
        if (progress < 1) {
          frame.current = requestAnimationFrame(animate);
        } else {
          // Land exactly on the target instead of the floored approximation.
          setCount(end);
          frame.current = null;
        }
      };

      frame.current = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) run();
      },
      { threshold: 0.3 }
    );

    observer.observe(node);

    // Already visible when a later value arrives: the observer will not fire
    // again on its own, so start from here.
    const rect = node.getBoundingClientRect();
    const visible = rect.top < window.innerHeight && rect.bottom > 0;
    if (visible) run();

    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [end, duration]);

  return { count, ref, displayValue: `${count}${count > 0 ? suffix : ''}` };
}
