export interface Rect {
  pos: { x: number; y: number };
  size: { x: number; y: number };
}

export const doesRectContainPoint = (r: Rect, p: { x: number; y: number }) => {
  return !(
    p.x < r.pos.x ||
    p.y < r.pos.y ||
    p.x >= r.pos.x + r.size.x ||
    p.y >= r.pos.y + r.size.y
  );
};

export const doesRectContainRect = function (this: Rect, r: Rect) {
  return (
    r.pos.x >= this.pos.x &&
    r.pos.x + r.size.x < this.pos.x + this.size.x &&
    r.pos.y >= this.pos.y &&
    r.pos.y + r.size.y < this.pos.y + this.size.y
  );
};

export const doRectsOverlap = (r1: Rect, r2: Rect) => {
  return (
    r1.pos.x < r2.pos.x + r2.size.x &&
    r1.pos.x + r1.size.x >= r2.pos.x &&
    r1.pos.y < r2.pos.y + r2.size.y &&
    r1.pos.y + r1.size.y >= r2.pos.y
  );
};
