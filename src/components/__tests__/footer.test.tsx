// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { Footer } from '@/components/footer'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: any
  }) => React.createElement('a', { href, ...props }, children),
}))

describe('Footer', () => {
  afterEach(() => {
    cleanup()
  })

  it('should render copyright text', () => {
    render(<Footer />)
    const copyrightText = screen.getByText(/© 2026/)
    expect(copyrightText).toBeDefined()
  })

  it('should render Facebook social link with correct URL from branding config', () => {
    render(<Footer />)
    const links = screen.getAllByRole('link', { name: /facebook/i })
    expect(links[0].getAttribute('href')).toBe('https://facebook.com/dreamersvc')
  })

  it('should render Instagram social link with correct URL from branding config', () => {
    render(<Footer />)
    const links = screen.getAllByRole('link', { name: /instagram/i })
    expect(links[0].getAttribute('href')).toBe('https://instagram.com/dreamersvc')
  })

  it('should have correct aria-labels for accessibility', () => {
    render(<Footer />)
    const fbLinks = screen.getAllByRole('link', { name: /facebook/i })
    const igLinks = screen.getAllByRole('link', { name: /instagram/i })
    expect(fbLinks[0].getAttribute('aria-label')).toBe('Visit our Facebook page')
    expect(igLinks[0].getAttribute('aria-label')).toBe('Visit our Instagram page')
  })

  it('should have security attributes on social links', () => {
    render(<Footer />)
    const fbLinks = screen.getAllByRole('link', { name: /facebook/i })
    const igLinks = screen.getAllByRole('link', { name: /instagram/i })
    expect(fbLinks[0].getAttribute('target')).toBe('_blank')
    expect(fbLinks[0].getAttribute('rel')).toBe('noopener noreferrer')
    expect(igLinks[0].getAttribute('target')).toBe('_blank')
    expect(igLinks[0].getAttribute('rel')).toBe('noopener noreferrer')
  })
})
