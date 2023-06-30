export const normalizeColor = (input: { r: number; g: number; b: number }) => {
  return {
    r: input.r / 255,
    g: input.g / 255,
    b: input.b / 255,
  };
};

export const generateColor = (): { r: number; g: number; b: number } => {
  const c: { r: number; g: number; b: number } = HSVtoRGB(
    Math.random(),
    1.0,
    1.0
  );
  c.r *= 0.15;
  c.g *= 0.15;
  c.b *= 0.15;
  return c;
};

const HSVtoRGB = (h, s, v): { r: number; g: number; b: number } => {
  let r, g, b: number;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }

  return {
    r,
    g,
    b,
  };
};
