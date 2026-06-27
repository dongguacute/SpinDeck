import { useEffect } from "react";

const INTERACTIVE_SELECTOR =
  "a, button, input, select, textarea, [role='button'], label";

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}

/** macOS overlay 窗口拖拽：页内顶栏（Settings / 选歌）上拖，其余页用透明 drag region */
export function DesktopDragRegion() {
  useEffect(() => {
    let disposed = false;
    let removeListener: (() => void) | undefined;

    void import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        if (disposed) return;

        const onMouseDown = (event: MouseEvent) => {
          if (event.button !== 0) return;

          const target = event.target;
          const dragHost =
            target instanceof Element
              ? target.closest(".desktop-titlebar, .shelf-header-root")
              : null;

          if (dragHost) {
            if (isInteractiveTarget(target)) return;
            void getCurrentWindow().startDragging();
            return;
          }

          if (target instanceof Element && target.closest(".desktop-drag-region")) {
            void getCurrentWindow().startDragging();
          }
        };

        document.addEventListener("mousedown", onMouseDown);
        removeListener = () => document.removeEventListener("mousedown", onMouseDown);
      })
      .catch(() => {
        // 浏览器环境无 Tauri API，忽略
      });

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, []);

  return <div className="desktop-drag-region" data-tauri-drag-region aria-hidden="true" />;
}
