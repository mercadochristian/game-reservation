import { describe, it, expect } from 'vitest'
import { branding, getBrandingMeta, Branding } from '../branding'

describe('branding config', () => {
  describe('branding object structure', () => {
    it('is defined', () => {
      expect(branding).toBeDefined()
    })

    it('is a valid Branding type', () => {
      expect(branding).toHaveProperty('name')
      expect(branding).toHaveProperty('tagline')
      expect(branding).toHaveProperty('logo')
      expect(branding).toHaveProperty('colors')
      expect(branding).toHaveProperty('theme')
      expect(branding).toHaveProperty('social')
    })
  })

  describe('name field', () => {
    it('is a non-empty string', () => {
      expect(typeof branding.name).toBe('string')
      expect(branding.name.length).toBeGreaterThan(0)
    })

    it('is defined', () => {
      expect(branding.name).toBeDefined()
    })
  })

  describe('tagline field', () => {
    it('is a non-empty string', () => {
      expect(typeof branding.tagline).toBe('string')
      expect(branding.tagline.length).toBeGreaterThan(0)
    })

    it('is defined', () => {
      expect(branding.tagline).toBeDefined()
    })
  })

  describe('logo object', () => {
    it('has all required fields', () => {
      expect(branding.logo).toHaveProperty('url')
      expect(branding.logo).toHaveProperty('altText')
      expect(branding.logo).toHaveProperty('width')
      expect(branding.logo).toHaveProperty('height')
    })

    it('url is a string starting with /', () => {
      expect(typeof branding.logo.url).toBe('string')
      expect(branding.logo.url.startsWith('/')).toBe(true)
    })

    it('altText is a non-empty string', () => {
      expect(typeof branding.logo.altText).toBe('string')
      expect(branding.logo.altText.length).toBeGreaterThan(0)
    })

    it('width is a positive number', () => {
      expect(typeof branding.logo.width).toBe('number')
      expect(branding.logo.width).toBeGreaterThan(0)
    })

    it('height is a positive number', () => {
      expect(typeof branding.logo.height).toBe('number')
      expect(branding.logo.height).toBeGreaterThan(0)
    })
  })

  describe('colors object', () => {
    it('has all 6 required color fields', () => {
      expect(branding.colors).toHaveProperty('primary')
      expect(branding.colors).toHaveProperty('secondary')
      expect(branding.colors).toHaveProperty('accent')
      expect(branding.colors).toHaveProperty('background')
      expect(branding.colors).toHaveProperty('text')
      expect(branding.colors).toHaveProperty('border')
    })

    it('all color values are non-empty strings', () => {
      Object.entries(branding.colors).forEach(([key, value]) => {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      })
    })

    it('all color values look like valid hex codes', () => {
      Object.entries(branding.colors).forEach(([key, value]) => {
        expect(value).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })
  })

  describe('theme object', () => {
    it('has lightMode and darkMode', () => {
      expect(branding.theme).toHaveProperty('lightMode')
      expect(branding.theme).toHaveProperty('darkMode')
    })

    describe('lightMode', () => {
      it('has background, foreground, muted fields', () => {
        expect(branding.theme.lightMode).toHaveProperty('background')
        expect(branding.theme.lightMode).toHaveProperty('foreground')
        expect(branding.theme.lightMode).toHaveProperty('muted')
      })

      it('all fields are non-empty strings', () => {
        Object.entries(branding.theme.lightMode).forEach(([key, value]) => {
          expect(typeof value).toBe('string')
          expect(value.length).toBeGreaterThan(0)
        })
      })
    })

    describe('darkMode', () => {
      it('has background, foreground, muted fields', () => {
        expect(branding.theme.darkMode).toHaveProperty('background')
        expect(branding.theme.darkMode).toHaveProperty('foreground')
        expect(branding.theme.darkMode).toHaveProperty('muted')
      })

      it('all fields are non-empty strings', () => {
        Object.entries(branding.theme.darkMode).forEach(([key, value]) => {
          expect(typeof value).toBe('string')
          expect(value.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('social object', () => {
    it('exists', () => {
      expect(branding.social).toBeDefined()
    })

    it('is an object', () => {
      expect(typeof branding.social).toBe('object')
      expect(branding.social).not.toBeNull()
    })

    it('all values are strings (URLs or empty)', () => {
      Object.values(branding.social).forEach((value) => {
        if (value !== undefined) {
          expect(typeof value).toBe('string')
        }
      })
    })
  })

  describe('getBrandingMeta function', () => {
    it('returns an object with title and description', () => {
      const meta = getBrandingMeta()
      expect(meta).toHaveProperty('title')
      expect(meta).toHaveProperty('description')
    })

    it('title matches branding.name', () => {
      const meta = getBrandingMeta()
      expect(meta.title).toBe(branding.name)
    })

    it('description matches branding.tagline', () => {
      const meta = getBrandingMeta()
      expect(meta.description).toBe(branding.tagline)
    })

    it('never throws', () => {
      expect(() => getBrandingMeta()).not.toThrow()
    })
  })
})
