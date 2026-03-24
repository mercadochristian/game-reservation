import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QRCodeModal } from '../qr-code-modal'

describe('QRCodeModal', () => {
  const mockOnOpenChange = vi.fn()
  const testQrUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  beforeEach(() => {
    mockOnOpenChange.mockClear()
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      <QRCodeModal open={false} onOpenChange={mockOnOpenChange} url={testQrUrl} />
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders dialog when open is true', () => {
    render(
      <QRCodeModal open={true} onOpenChange={mockOnOpenChange} url={testQrUrl} />
    )
    expect(screen.getByText('QR Code')).toBeDefined()
  })

  it('displays QR code image when url is provided', () => {
    render(
      <QRCodeModal open={true} onOpenChange={mockOnOpenChange} url={testQrUrl} />
    )
    const image = screen.getByRole('img', { name: /qr code/i })
    expect(image.getAttribute('src')).toBe(testQrUrl)
  })

  it('does not display image when url is null', () => {
    render(
      <QRCodeModal open={true} onOpenChange={mockOnOpenChange} url={null} />
    )
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('displays helper text for mobile users', () => {
    render(
      <QRCodeModal open={true} onOpenChange={mockOnOpenChange} url={testQrUrl} />
    )
    expect(screen.getByText(/click the image to save or scan/i)).toBeDefined()
  })
})
