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
    expect(copyrightText).toBeTruthy()
  })

  it('should render Facebook social link', () => {
    render(<Footer />)
    const links = screen.getAllByRole('link', { name: /facebook/i })
    expect(links[0].getAttribute('href')).toContain('facebook.com')
  })

  it('should render Instagram social link', () => {
    render(<Footer />)
    const links = screen.getAllByRole('link', { name: /instagram/i })
    expect(links[0].getAttribute('href')).toContain('instagram.com')
  })

  it('should have correct aria-labels for accessibility', () => {
    render(<Footer />)
    const fbLinks = screen.getAllByRole('link', { name: /facebook/i })
    const igLinks = screen.getAllByRole('link', { name: /instagram/i })
    expect(fbLinks[0].getAttribute('aria-label')).toBeTruthy()
    expect(igLinks[0].getAttribute('aria-label')).toBeTruthy()
  })
})
