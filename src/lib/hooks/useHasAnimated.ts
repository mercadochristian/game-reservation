'use client'

import { useEffect, useRef } from 'react'

/**
 * Returns a ref that is `false` on first render and `true` after mount.
 * Use with Framer Motion to skip re-animation after router.refresh():
 *
 *   const hasAnimated = useHasAnimated()
 *   <motion.div initial={hasAnimated.current ? false : "hidden"} ... />
 */
export function useHasAnimated() {
  const hasAnimated = useRef(false)
  useEffect(() => {
    hasAnimated.current = true
  }, [])
  return hasAnimated
}
