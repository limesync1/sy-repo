// Auto-scroll under drag — gør at lange lister/kalender ruller af sig selv når
// brugeren trækker et kort tæt på top- eller bundkanten af en scroll-container.
// Helt framework-uafhængigt: drives af en pointer-ref + en RAF-løkke.
//
// Mønster:
//   const point = { x, y };           // opdateres løbende under drag
//   startDragAutoScroll(() => point); // ved drag-start
//   stopDragAutoScroll();             // ved drag-slut

type Point = { x: number; y: number };

const EDGE = 90;        // px-zone fra kanten hvor scroll begynder
const MAX_SPEED = 22;   // px pr. frame ved kanten

let rafId: number | null = null;
let getPoint: (() => Point | null) | null = null;

const isScrollable = (el: Element): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  const style = getComputedStyle(el);
  const oy = style.overflowY;
  return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1;
};

const tick = () => {
  rafId = requestAnimationFrame(tick);
  const point = getPoint?.();
  if (!point || typeof document === "undefined") return;

  const stack = typeof document.elementsFromPoint === "function"
    ? document.elementsFromPoint(point.x, point.y)
    : ([document.elementFromPoint(point.x, point.y)].filter(Boolean) as Element[]);

  for (const el of stack) {
    let node: Element | null = el;
    while (node) {
      if (isScrollable(node)) {
        const rect = node.getBoundingClientRect();
        const topDist = point.y - rect.top;
        const bottomDist = rect.bottom - point.y;
        if (topDist >= 0 && topDist < EDGE && node.scrollTop > 0) {
          const speed = MAX_SPEED * (1 - topDist / EDGE);
          node.scrollTop -= speed;
          return;
        }
        if (
          bottomDist >= 0 && bottomDist < EDGE &&
          node.scrollTop + node.clientHeight < node.scrollHeight - 1
        ) {
          const speed = MAX_SPEED * (1 - bottomDist / EDGE);
          node.scrollTop += speed;
          return;
        }
      }
      node = node.parentElement;
    }
  }
};

export const startDragAutoScroll = (pointGetter: () => Point | null) => {
  getPoint = pointGetter;
  if (rafId == null) rafId = requestAnimationFrame(tick);
};

export const stopDragAutoScroll = () => {
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  getPoint = null;
};
