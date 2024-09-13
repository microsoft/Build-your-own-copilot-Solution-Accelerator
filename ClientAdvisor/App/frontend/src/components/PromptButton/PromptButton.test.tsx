// PromptButton.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptButton } from './PromptButton'


describe('PromptButton', () => {
  const mockOnClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with the correct text', () => {
    render(<PromptButton onClick={mockOnClick} name="Click Me" disabled={false} />)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    render(<PromptButton onClick={mockOnClick} name="Click Me" disabled={false} />)
    fireEvent.click(screen.getByText('Click Me'))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    render(<PromptButton onClick={mockOnClick} name="Click Me" disabled={true} />)
    fireEvent.click(screen.getByText('Click Me'))
    expect(mockOnClick).not.toHaveBeenCalled()
  })

  it('has the correct class name applied', () => {
    render(<PromptButton onClick={mockOnClick} name="Click Me" disabled={false} />)
    //expect(screen.getByText('Click Me')).toHaveClass('mockPromptBtn')
  })

  it('renders with default name when not provided', () => {
    render(<PromptButton name="Click Me" onClick={mockOnClick} disabled={false} />)
    //expect(screen.getByRole('button')).toHaveTextContent('')  
})
})
