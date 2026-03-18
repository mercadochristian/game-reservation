import type { Variants } from 'framer-motion'

/**
 * Standard staggered fade-up animation.
 * Pass a numeric `custom` prop to each motion element to control stagger delay.
 *
 * Usage:
 *   <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants}>
 *   <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants}>
 */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: custom * 0.1 },
  }),
}

/**
 * Simple fade-in with no vertical movement. Useful for overlays and modals.
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.3, delay: custom * 0.1 },
  }),
}

/**
 * Slide in from the left. Useful for drawers and side panels.
 */
export const slideInVariants: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: (custom: number = 0) => ({
    opacity: 0,
    x: 0,
    transition: { duration: 0.3, delay: custom * 0.1 },
  }),
}
