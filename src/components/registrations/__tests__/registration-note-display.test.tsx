// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RegistrationNoteDisplay } from '@/components/registrations/registration-note-display'

describe('RegistrationNoteDisplay', () => {
  it('should render note text when note exists', () => {
    render(<RegistrationNoteDisplay note="Test note content" />)
    expect(screen.getByText('Test note content')).toBeInTheDocument()
  })

  it('should render label "Your note:" before note text', () => {
    const { container } = render(<RegistrationNoteDisplay note="Test note" />)
    const label = container.querySelector('p')
    expect(label).toHaveTextContent('Your note:')
  })

  it('should not render when note is null', () => {
    const { container } = render(<RegistrationNoteDisplay note={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should not render when note is empty string', () => {
    const { container } = render(<RegistrationNoteDisplay note="" />)
    expect(container.firstChild).toBeNull()
  })

  it('should use muted text color for note', () => {
    const { container } = render(<RegistrationNoteDisplay note="Test" />)
    const noteElement = container.querySelector('[data-testid="note-text"]')
    expect(noteElement).toHaveClass('text-muted-foreground')
  })
})
