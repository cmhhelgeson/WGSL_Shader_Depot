import { generateColor } from './color';

export class PointerPrototype {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: [number, number, number];
  constructor() {
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
  }
}

const correctDeltaX = (
  delta: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const aspectRatio = canvasWidth / canvasHeight;
  if (aspectRatio < 1) delta *= aspectRatio;
  return delta;
};

const correctDeltaY = (
  delta: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const aspectRatio = canvasWidth / canvasHeight;
  if (aspectRatio > 1) delta /= aspectRatio;
  return delta;
};

export const updatePointerDownData = (
  pointer: PointerPrototype,
  id: number,
  posX: number,
  posY: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  pointer.id = id;
  pointer.down = true;
  pointer.moved = false;
  pointer.texcoordX = posX / canvasWidth;
  pointer.texcoordY = 1.0 - posY / canvasHeight;
  pointer.prevTexcoordX = pointer.texcoordX;
  pointer.prevTexcoordY = pointer.texcoordY;
  pointer.deltaX = 0;
  pointer.deltaY = 0;
  const color = generateColor();
  pointer.color = [color.r, color.g, color.b];
};

export const updatePointerMoveData = (
  pointer: PointerPrototype,
  posX: number,
  posY: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  pointer.prevTexcoordX = pointer.texcoordX;
  pointer.prevTexcoordY = pointer.texcoordY;
  pointer.texcoordX = posX / canvasWidth;
  pointer.texcoordY = 1.0 - posY / canvasHeight;
  pointer.deltaX = correctDeltaX(
    pointer.texcoordX - pointer.prevTexcoordX,
    canvasWidth,
    canvasHeight
  );
  pointer.deltaY = correctDeltaY(
    pointer.texcoordY - pointer.prevTexcoordY,
    canvasWidth,
    canvasHeight
  );
  pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
};

export const updatePointerUpData = (pointer: PointerPrototype) => {
  pointer.down = false;
};

export type MouseStep = {
  x: number;
  y: number;
};

export type MouseInfo = {
  current: MouseStep | null;
  last: MouseStep | null;
  velocity: MouseStep;
};

export const InitMouse = (): MouseInfo => {
  return {
    current: null,
    last: null,
    velocity: {x: 0, y: 0},
  };
};

export const getMouseVelocity = (
  prevMouse: MouseStep,
  curMouse: MouseStep,
): MouseStep => {
  return {
    x: curMouse.x - prevMouse.x,
    y: curMouse.y - prevMouse.y
  }
}