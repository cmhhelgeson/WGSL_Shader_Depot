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
    x: [0, -10],
    transition: {
      ease: 'easeIn',
      duration: 0.3,
    },
    scaleY: [1, 1.2],
  },
  shiftBackFromLeft: {
    x: [-10, 0],
    transition: {
      ease: 'easeOut',
      duration: 0.3,
    },
    scaleY: [1.2, 1],
  },
  shiftRight: {
    x: [0, 10],
    transition: {
      ease: 'easeIn',
      duration: 0.3,
    },
    scaleY: [1, 1.2],
  },
  shiftBackFromRight: {
    x: [10, 0],
    transition: {
      ease: 'easeOut',
      duration: 0.3,
    },
    scaleY: [1.2, 1],
  },
};

type DebugAreaVariantKeys = 'appearBelow' | 'appearAbove';

type DebugAreaVariantType = {
  [key in DebugAreaVariantKeys]: Variant;
};

export const debugAreaVariants: DebugAreaVariantType = {
  appearBelow: {
    y: [20, 0],
    opacity: [0, 1],
    transition: {
      ease: 'easeIn',
      duration: 0.5,
    },
  },
  appearAbove: {
    y: [-20, 0],
    opacity: [0, 1],
    transition: {
      ease: 'easeIn',
      duration: 0.5,
    },
  },
};

export type AnimationKeysType = {
  canvas: CanvasVariantKeys | '';
  debugButtonLeft: DebugButtonVariantKeys | '';
  debugButtonRight: DebugButtonVariantKeys | '';
  debugArea: DebugAreaVariantKeys | '';
};
