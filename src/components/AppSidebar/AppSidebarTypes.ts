/* eslint-disable prettier/prettier */
import { Variant } from "framer-motion";

type TriangleVariantKeys =
  | 'open'
  | 'close'

type ListVariantKeys = 'open' | 'close'
type ListVariantType = {
  [key in ListVariantKeys]: Variant;
}
type TriangleVariantType = {
  [key in TriangleVariantKeys]: Variant;
};

export const triangleVariants: TriangleVariantType = {
  open: { rotate: 180 },
  close: { rotate: 0 },
}

export const listVariants: ListVariantType = {
  open: {
    opacity: 1,
    height: 'auto',
    transition: {
      type: "spring",
      bounce: 0.4,
      duration: 0.7,
      delayChildren: 0.3,
      staggerChildren: 0.05
    }
  },
  close: {
    opacity: 0,
    height: 0,
    marginBottom: 10,
    transition: {
      type: "spring",
      bounce: 0,
      duration: 0.3
    }
  }
}

export const listItemVariants: ListVariantType = {
  open: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 1000, damping: 24 },
    pointerEvents: 'all',
  },
  close: { opacity: 0, y: 20, transition: { duration: 0.2 }, pointerEvents: 'none'},
};

export type AppSidebarAnimationKeysType = {
  triangle: TriangleVariantKeys | '';
  list: ListVariantKeys | ''
}

type ListItemTextVariantKeys =
  | 'initial'
  | 'coil'
  | 'release'

type ListItemTextVariants = {
  [key in ListItemTextVariantKeys]: Variant;
}

export type SubItemKeysType = {
  text: ListItemTextVariantKeys | '',
  period: ListItemTextVariantKeys | ''
}
