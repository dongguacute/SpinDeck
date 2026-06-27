import { useRef, useCallback } from "react";
import gsap from "gsap";

export function useSwipeNavigation(
  inPlayback: boolean,
  playbackWrapperRef: React.RefObject<HTMLDivElement | null>,
  playNextSong: () => void,
  playPrevSong: () => void,
  disabled: boolean = false
) {
  const swipeRef = useRef<{ x: number; time: number; startX: number } | null>(null);
  const wheelAccumulator = useRef(0);
  const cooldownRef = useRef(false);
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!inPlayback || disabled) return;
    
    // 检查是否处于强制横屏模式（手机竖屏 + 播放态）
    const isForceLandscape = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    
    // 如果是强制横屏，clientX 对应元素的 Y 轴，clientY 对应元素的 X 轴（反向）
    const startPos = isForceLandscape ? e.clientY : e.clientX;
    
    swipeRef.current = { x: startPos, time: Date.now(), startX: startPos };
    
    if (playbackWrapperRef.current) {
      gsap.killTweensOf(playbackWrapperRef.current);
    }
  }, [inPlayback, disabled, playbackWrapperRef]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!swipeRef.current || !inPlayback || disabled || !playbackWrapperRef.current) return;
    
    const isForceLandscape = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    const currentPos = isForceLandscape ? e.clientY : e.clientX;
    
    const delta = currentPos - swipeRef.current.startX;
    // 强制横屏下，物理 Y 的增加对应元素 X 的增加（因为旋转了 90 度）
    gsap.set(playbackWrapperRef.current, { x: delta });
  }, [inPlayback, disabled, playbackWrapperRef]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!swipeRef.current || !inPlayback || disabled || !playbackWrapperRef.current) return;
    
    const isForceLandscape = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    const currentPos = isForceLandscape ? e.clientY : e.clientX;
    
    const delta = currentPos - swipeRef.current.startX;
    const deltaTime = Date.now() - swipeRef.current.time;
    const velocity = Math.abs(delta) / deltaTime;
    swipeRef.current = null;

    const threshold = (isForceLandscape ? window.innerHeight : window.innerWidth) * 0.2;
    const isQuickSwipe = velocity > 0.5 && Math.abs(delta) > 30;

    if (Math.abs(delta) > threshold || isQuickSwipe) {
      const direction = delta > 0 ? "prev" : "next";
      const targetOffset = isForceLandscape ? window.innerHeight : window.innerWidth;
      const targetX = direction === "prev" ? targetOffset : -targetOffset;
      
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
  }, [inPlayback, disabled, playbackWrapperRef, playNextSong, playPrevSong]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!inPlayback || disabled || cooldownRef.current) return;

    const isForceLandscape = window.innerWidth < 768 && window.innerHeight > window.innerWidth;

    // 关注横向滚动，或者纵向滚动（如果 deltaX 为 0）
    let dx = e.deltaX;
    let dy = e.deltaY;

    // 抹平不同浏览器的 deltaMode 差异
    if (e.deltaMode === 1) { // 行模式
      dx *= 20;
      dy *= 20;
    } else if (e.deltaMode === 2) { // 页模式
      dx *= window.innerWidth;
      dy *= window.innerHeight;
    }
    
    // 强制横屏下，物理 dy 对应逻辑 dx
    const delta = isForceLandscape ? dy : (Math.abs(dx) > Math.abs(dy) ? dx : dy);

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
  }, [inPlayback, disabled, playbackWrapperRef, playNextSong, playPrevSong]);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onWheel: handleWheel,
  };
}
