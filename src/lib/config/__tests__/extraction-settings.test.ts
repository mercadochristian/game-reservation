// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('getExtractionSetting', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return enabled: true when AI_EXTRACTION_ENABLED is not set', async () => {
    delete process.env.AI_EXTRACTION_ENABLED
    const { getExtractionSetting } = await import('../extraction-settings')
    expect(getExtractionSetting()).toEqual({ enabled: true })
  })

  it('should return enabled: true when AI_EXTRACTION_ENABLED is "true"', async () => {
    process.env.AI_EXTRACTION_ENABLED = 'true'
    const { getExtractionSetting } = await import('../extraction-settings')
    expect(getExtractionSetting()).toEqual({ enabled: true })
  })

  it('should return enabled: false when AI_EXTRACTION_ENABLED is "false"', async () => {
    process.env.AI_EXTRACTION_ENABLED = 'false'
    const { getExtractionSetting } = await import('../extraction-settings')
    expect(getExtractionSetting()).toEqual({ enabled: false })
  })

  it('should return enabled: true for any value other than "false"', async () => {
    process.env.AI_EXTRACTION_ENABLED = 'off'
    const { getExtractionSetting } = await import('../extraction-settings')
    expect(getExtractionSetting()).toEqual({ enabled: true })
  })
})
