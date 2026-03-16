import brandingData from '../../../branding.json'

export interface Branding {
  name: string
  tagline: string
  logo: {
    url: string
    altText: string
    width: number
    height: number
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    border: string
  }
  theme: {
    lightMode: {
      background: string
      foreground: string
      muted: string
    }
    darkMode: {
      background: string
      foreground: string
      muted: string
    }
  }
  social: {
    twitter?: string
    facebook?: string
    instagram?: string
  }
}

export const branding: Branding = brandingData as Branding

export function getBrandingMeta() {
  return {
    title: branding.name,
    description: branding.tagline,
  }
}
