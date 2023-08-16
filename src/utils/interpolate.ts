export const cosineInterpolate = (val1: number, val2: number, t: number) => {
  const t2 = (1 - Math.cos(t * Math.PI)) / 2;
  return val1 * (1 - t2) + val2 * t2;
};
