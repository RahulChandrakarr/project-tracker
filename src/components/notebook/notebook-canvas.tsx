"use client";

import * as React from "react";
import HTMLFlipBook from "react-pageflip";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DrawingCanvas } from "./drawing-canvas";
import { asDrawing } from "./drawing";
import { PageWorkspace } from "./page-workspace";
import { PageSurface } from "./page-surface";
import { StaticPageBody } from "./static-page-body";
import { useNotebook, useNotebookStore } from "./notebook-store";

// react-pageflip ships strict, all-required prop types; wrap it in the loose
// surface we actually use.
type FlipApi = {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (page: number) => void;
};
type FlipRef = { pageFlip: () => FlipApi };
type FlipProps = {
  width: number;
  height: number;
  size?: "fixed" | "stretch";
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  maxShadowOpacity?: number;
  showCover?: boolean;
  drawShadow?: boolean;
  flippingTime?: number;
  usePortrait?: boolean;
  mobileScrollSupport?: boolean;
  useMouseEvents?: boolean;
  clickEventForward?: boolean;
  showPageCorners?: boolean;
  startPage?: number;
  className?: string;
  style?: React.CSSProperties;
  onFlip?: (e: { data: number }) => void;
  children: React.ReactNode;
};
const FlipBook = HTMLFlipBook as unknown as React.ForwardRefExoticComponent<
  FlipProps & React.RefAttributes<FlipRef>
>;

// Pages handed to react-pageflip must forward a ref to their root element.
const BookPage = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  function BookPage({ children }, ref) {
    return (
      <div ref={ref} className="nb-bookpage">
        {children}
      </div>
    );
  },
);

export function NotebookCanvas() {
  const store = useNotebookStore();
  const viewMode = useNotebook((s) => s.viewMode);
  const pages = useNotebook((s) => s.pages);
  const currentIndex = useNotebook((s) => s.currentIndex);
  const goTo = useNotebook((s) => s.goTo);
  const flipRef = React.useRef<FlipRef | null>(null);

  const navigate = React.useCallback(
    (dir: "next" | "prev") => {
      if (store.getState().viewMode === "double") {
        const api = flipRef.current?.pageFlip();
        if (dir === "next") api?.flipNext();
        else api?.flipPrev();
      } else if (dir === "next") store.getState().next();
      else store.getState().prev();
    },
    [store],
  );

  // Keep the flip-book aligned when the page changes from elsewhere (sidebar).
  React.useEffect(() => {
    if (viewMode !== "double") return;
    const api = flipRef.current?.pageFlip();
    try {
      api?.turnToPage(currentIndex);
    } catch {
      /* flip-book not ready yet */
    }
  }, [currentIndex, viewMode]);

  // Arrow-key navigation (ignored while typing in the editor or a field).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      ) {
        return;
      }
      if (e.key === "ArrowRight") navigate("next");
      else if (e.key === "ArrowLeft") navigate("prev");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  if (pages.length === 0) return null;

  if (viewMode === "single") {
    const page = pages[currentIndex] ?? pages[0];
    return (
      <div className="nb-stage">
        <NavButton
          dir="prev"
          onClick={() => navigate("prev")}
          disabled={currentIndex <= 0}
        />
        <div className="nb-single" style={{ perspective: 2000 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page.id}
              className="h-full w-full"
              style={{ transformStyle: "preserve-3d" }}
              initial={{ opacity: 0, rotateY: -10, x: 30 }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              exit={{ opacity: 0, rotateY: 10, x: -30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <PageWorkspace page={page} pageNumber={currentIndex + 1} />
            </motion.div>
          </AnimatePresence>
        </div>
        <NavButton
          dir="next"
          onClick={() => navigate("next")}
          disabled={currentIndex >= pages.length - 1}
        />
      </div>
    );
  }

  return (
    <div className="nb-stage">
      <NavButton dir="prev" onClick={() => navigate("prev")} />
      <div className="nb-book">
        <FlipBook
          ref={flipRef}
          className="nb-flip"
          width={460}
          height={620}
          size="stretch"
          minWidth={300}
          maxWidth={520}
          minHeight={420}
          maxHeight={760}
          maxShadowOpacity={0.5}
          showCover={false}
          drawShadow
          flippingTime={700}
          usePortrait
          mobileScrollSupport
          useMouseEvents
          startPage={currentIndex}
          onFlip={(e) => goTo(e.data)}
        >
          {pages.map((p, i) => (
            <BookPage key={p.id}>
              <PageSurface
                page={p}
                pageNumber={i + 1}
                overlay={
                  <DrawingCanvas editable={false} drawing={asDrawing(p.drawing)} />
                }
              >
                <StaticPageBody content={p.content} />
              </PageSurface>
            </BookPage>
          ))}
        </FlipBook>
      </div>
      <NavButton dir="next" onClick={() => navigate("next")} />
    </div>
  );
}

function NavButton({
  dir,
  onClick,
  disabled,
}: {
  dir: "next" | "prev";
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = dir === "next" ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "next" ? "Next page" : "Previous page"}
      className="nb-nav"
    >
      <Icon className="size-5" />
    </button>
  );
}
