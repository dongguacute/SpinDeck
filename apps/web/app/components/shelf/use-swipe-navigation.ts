import { useRef, useCallback } from "react";
import gsap from "gsap";

export function useSwipeNavigation(
  inPlayback: boolean,
  playbackWrapperRef: React.RefObject<HTMLDivElement | null>,
  playNextSong: () => void,
  playPrevSong: () => void
) {
  const swipeRef = useRef<{ x: number; time: number; startX: number } | null>(null);
  const wheelAccumulator = useRef(0);
  const cooldownRef = useRef(false);
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!inPlayback || cooldownRef.current) return;

    // 关注横向滚动，或者纵向滚动（如果 deltaX 为 0）
    const dx = e.deltaX;
    const dy = e.deltaY;
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;

    // 忽略微小滚动
    if (Math.abs(delta) < 5) return;

    wheelAccumulator.current += delta;

    // 清除重置计时器
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    
    // 如果停止滚动 200ms，重置累加器
    wheelTimerRef.current = setTimeout(() => {
      wheelAccumulator.current = 0;
    }, 200);

    // 触控板滑动的阈值
    const threshold = 100;

    if (Math.abs(wheelAccumulator.current) > threshold) {
      const direction = wheelAccumulator.current > 0 ? "next" : "prev";
      wheelAccumulator.current = 0;
      cooldownRef.current = true;
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);

      const targetX = direction === "prev" ? window.innerWidth : -window.innerWidth;
      
      if (playbackWrapperRef.current) {
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
                { 
                  x: 0, 
                  opacity: 1, 
                  duration: 0.5, 
                  ease: "back.out(1.2)",
                  onComplete: () => {
                    // 切换完成后开启短暂冷却
                    setTimeout(() => {
                      cooldownRef.current = false;
                    }, 500);
                  }
                }
              );
            }
          }
        });
      }
    }
  }, [inPlayback, playbackWrapperRef, playNextSong, playPrevSong]);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onWheel: handleWheel,
  };
}
