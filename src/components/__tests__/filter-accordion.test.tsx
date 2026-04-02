// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

import { FilterAccordion } from '../filter-accordion'

describe('FilterAccordion', () => {
  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('is exported as a memo-wrapped component', () => {
    expect((FilterAccordion as any).$$typeof?.toString()).toContain('react.memo')
  })

  describe('label rendering', () => {
    it('renders the default label "Filters" when no label prop is given', () => {
      render(
        <FilterAccordion open={false} onToggle={vi.fn()}>
          <div>child content</div>
        </FilterAccordion>
      )
      expect(screen.getByText('Filters')).toBeDefined()
    })

    it('renders a custom label when the label prop is provided', () => {
      render(
        <FilterAccordion open={false} onToggle={vi.fn()} label="Search Options">
          <div>child content</div>
        </FilterAccordion>
      )
      expect(screen.getByText('Search Options')).toBeDefined()
    })

    it('appends the active filter count to the label when activeFilterCount > 0', () => {
      render(
        <FilterAccordion open={false} onToggle={vi.fn()} label="Filters" activeFilterCount={3}>
          <div>child content</div>
        </FilterAccordion>
      )
      expect(screen.getByText('Filters (3)')).toBeDefined()
    })

    it('does not append count to label when activeFilterCount is 0', () => {
      render(
        <FilterAccordion open={false} onToggle={vi.fn()} label="Filters" activeFilterCount={0}>
          <div>child content</div>
        </FilterAccordion>
      )
      expect(screen.getByText('Filters')).toBeDefined()
      expect(screen.queryByText('Filters (0)')).toBeNull()
    })

    it('does not append count to label when activeFilterCount is undefined', () => {
      render(
        <FilterAccordion open={false} onToggle={vi.fn()} label="Filters">
          <div>child content</div>
        </FilterAccordion>
      )
      expect(screen.getByText('Filters')).toBeDefined()
    })
  })

  describe('open/closed state (CSS grid approach)', () => {
    it('renders children in the DOM when open', () => {
      render(
        <FilterAccordion open={true} onToggle={vi.fn()}>
          <div>child content</div>
        </FilterAccordion>
      )
      expect(screen.getByText('child content')).toBeDefined()
    })

    it('renders children in DOM when closed (hidden via CSS grid 0fr)', () => {
      render(
        <FilterAccordion open={false} onToggle={vi.fn()}>
          <div>child content</div>
        </FilterAccordion>
      )
      // Children are always in the DOM with the CSS grid approach
      expect(screen.getByText('child content')).toBeDefined()
    })

    it('sets grid-template-rows to 1fr when open', () => {
      const { container } = render(
        <FilterAccordion open={true} onToggle={vi.fn()}>
          <div>child content</div>
        </FilterAccordion>
      )
      const gridDiv = container.querySelector('[style*="grid-template-rows"]') as HTMLElement
      expect(gridDiv.style.gridTemplateRows).toBe('1fr')
    })

    it('sets grid-template-rows to 0fr when closed', () => {
      const { container } = render(
        <FilterAccordion open={false} onToggle={vi.fn()}>
          <div>child content</div>
        </FilterAccordion>
      )
      const gridDiv = container.querySelector('[style*="grid-template-rows"]') as HTMLElement
      expect(gridDiv.style.gridTemplateRows).toBe('0fr')
    })

    it('applies opacity-100 class when open', () => {
      const { container } = render(
        <FilterAccordion open={true} onToggle={vi.fn()}>
          <div>child content</div>
        </FilterAccordion>
      )
      const contentDiv = container.querySelector('.opacity-100')
      expect(contentDiv).not.toBeNull()
    })

    it('applies opacity-0 class when closed', () => {
      const { container } = render(
        <FilterAccordion open={false} onToggle={vi.fn()}>
          <div>child content</div>
        </FilterAccordion>
      )
      const contentDiv = container.querySelector('.opacity-0')
      expect(contentDiv).not.toBeNull()
    })
  })

  describe('toggle behavior', () => {
    it('calls onToggle when the header button is clicked', () => {
      const onToggle = vi.fn()
      render(
        <FilterAccordion open={false} onToggle={onToggle}>
          <div>child content</div>
        </FilterAccordion>
      )
      fireEvent.click(screen.getByRole('button'))
      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })
})
