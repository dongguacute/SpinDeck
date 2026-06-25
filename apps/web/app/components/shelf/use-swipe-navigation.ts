import { useRef, useCallback } from "react";
import gsap from "gsap";

export function useSwipeNavigation(
  inPlayback: boolean,
  playbackWrapperRef: React.RefObject<HTMLDivElement | null>,
  playNextSong: () => void,
  playPrevSong: () => void
) {
  const swipeRef = useRef<{ x: number; time: number; startX: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!inPlayback) return;
    swipeRef.current = { x: e.clientX, time: Date.now(), startX: e.clientX };
    
    if (playbackWrapperRef.current) {
      gsap.killTweensOf(playbackWrapperRef.current);
    }
  }, [inPlayback, playbackWrapperRef]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!swipeRef.current || !inPlayback || !playbackWrapperRef.current) return;
    
    const deltaX = e.clientX - swipeRef.current.startX;
    gsap.set(playbackWrapperRef.current, { x: deltaX });
  }, [inPlayback, playbackWrapperRef]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!swipeRef.current || !inPlayback || !playbackWrapperRef.current) return;
    
    const deltaX = e.clientX - swipeRef.current.startX;
    const deltaTime = Date.now() - swipeRef.current.time;
    const velocity = Math.abs(deltaX) / deltaTime;
    swipeRef.current = null;

    const threshold = window.innerWidth * 0.2;
    const isQuickSwipe = velocity > 0.5 && Math.abs(deltaX) > 30;

    if (Math.abs(deltaX) > threshold || isQuickSwipe) {
      const direction = deltaX > 0 ? "prev" : "next";
      const targetX = direction === "prev" ? window.innerWidth : -window.innerWidth;
      
      gsap.to(playbackWrapperRef.current, {
        x: targetX,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          if (direction === "prev") playPrevSong();
          else playNextSong();
          
          if (playbackWrapperRef.current) {
            gsap.fromTo(playbackWrapperRef.current, 
              { x: -targetX, opacity: 0 },
              { x: 0, opacity: 1, duration: 0.5, ease: "back.out(1.2)" }
            );
          }
        }
      });
    } else {
      gsap.to(playbackWrapperRef.current, {
        x: 0,
        duration: 0.4,
        ease: "elastic.out(1, 0.75)"
      });
    }
  }, [inPlayback, playbackWrapperRef, playNextSong, playPrevSong]);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };
}
