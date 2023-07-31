import { Variant } from 'framer-motion';

type CanvasVariantKeys =
  | 'moveOffscreenRight'
  | 'moveOffscreenLeft'
  | 'moveOnscreenRight'
  | 'moveOnscreenLeft';
export type CanvasVariantType = {
  [key in CanvasVariantKeys]: Variant;
};

export const canvasVariants: CanvasVariantType = {
  moveOffscreenRight: {
    x: [0, 1000],
    transition: {
      duration: 0.3,
    },
  },
  moveOffscreenLeft: {
    x: [0, -1000],
    transition: {
      duration: 0.3,
    },
  },
  moveOnscreenLeft: {
    x: [1000, 0],
    transition: {
      duration: 0.3,
    },
  },
  moveOnscreenRight: {
    x: [-1000, 0],
    transition: {
      duration: 0.3,
    },
  },
};

type DebugButtonVariantKeys =
  | 'shiftLeft'
  | 'shiftRight'
  | 'shiftBackFromLeft'
  | 'shiftBackFromRight';
type DebugVariantType = {
  [key in DebugButtonVariantKeys]: Variant;
};

export const debugButtonVariants: DebugVariantType = {
  shiftLeft: {
    x: [0, -9],
    transition: {
      ease: 'easeIn',
    },
  },
  shiftBackFromLeft: {
    x: [-9, 0],
    transition: {
      ease: 'easeOut',
    },
  },
  shiftRight: {
    x: [0, 9],
    transition: {
      ease: 'easeIn',
    },
  },
  shiftBackFromRight: {
    x: [9, 0],
    transition: {
      ease: 'easeOut',
    },
  },
};

export type AnimationKeysType = {
  canvas: CanvasVariantKeys | '';
  debugButtonLeft: DebugButtonVariantKeys | '';
  debugButtonRight: DebugButtonVariantKeys | '';
};
