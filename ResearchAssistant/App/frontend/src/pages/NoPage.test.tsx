import React from 'react'
import { render, screen } from '@testing-library/react'
import NoPage from './NoPage'

describe('NoPage Component', () => {
  test('renders 404 heading', () => {
    render(<NoPage />)

    const headingElement = screen.getByRole('heading', { level: 1 })

    expect(headingElement).toBeInTheDocument()
    expect(headingElement).toHaveTextContent('404')
  })
})
