import brandingData from '../../../branding.json'

export interface Logo {
  url: string
  altText: string
  width: number
  height: number
}

export interface ColorTheme {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  border: string
}

export interface ThemeMode {
  background: string
  foreground: string
  muted: string
}

export interface Branding {
  name: string
  tagline: string
  logo: Logo
  colors: ColorTheme
  theme: {
    lightMode: ThemeMode
    darkMode: ThemeMode
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

export function getPrimaryColor() {
  return branding.colors.primary
}

export function getAccentColor() {
  return branding.colors.accent
}

export function getLogoUrl() {
  return branding.logo.url
}

export function getBrandName() {
  return branding.name
}
