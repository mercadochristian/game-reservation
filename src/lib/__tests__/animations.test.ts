import { describe, it, expect } from 'vitest'
import { fadeUpVariants, fadeInVariants } from '../animations'

describe('fadeUpVariants', () => {
  it('has y-offset of 12px in hidden state', () => {
    expect(fadeUpVariants.hidden).toEqual({ opacity: 0, y: 12 })
  })

  it('has duration of 0.25s', () => {
    const visible = (fadeUpVariants.visible as (custom?: number) => Record<string, unknown>)(0)
    expect(visible.transition).toEqual({ duration: 0.25, delay: 0 })
  })

  it('has stagger delay of 0.06s per item', () => {
    const visible = (fadeUpVariants.visible as (custom?: number) => Record<string, unknown>)(3)
    expect(visible.transition).toEqual({ duration: 0.25, delay: 0.18 })
  })

  it('defaults custom to 0 when not provided', () => {
    const visible = (fadeUpVariants.visible as (custom?: number) => Record<string, unknown>)()
    expect(visible.transition).toEqual({ duration: 0.25, delay: 0 })
  })
})

describe('fadeInVariants', () => {
  it('has no vertical offset in hidden state', () => {
    expect(fadeInVariants.hidden).toEqual({ opacity: 0 })
  })

  it('has duration of 0.2s', () => {
    const visible = (fadeInVariants.visible as (custom?: number) => Record<string, unknown>)(0)
    expect(visible.transition).toEqual({ duration: 0.2, delay: 0 })
  })

  it('has stagger delay of 0.06s per item', () => {
    const visible = (fadeInVariants.visible as (custom?: number) => Record<string, unknown>)(2)
    expect(visible.transition).toEqual({ duration: 0.2, delay: 0.12 })
  })
})
