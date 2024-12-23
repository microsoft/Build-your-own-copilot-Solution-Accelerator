
import React from 'react'
import { render, screen } from '@testing-library/react'
import Homepage from './Homepage'
import { type SidebarOptions } from '../../components/SidebarView/SidebarView'
// Mock the icon
jest.mock('../../assets/RV-Copilot.svg', () => 'mocked-icon-path.svg')
// Mock the child components
jest.mock('../../components/Homepage/Cards', () => ({
  FeatureCard: ({ title, description, featureSelection, icon }: { title: string, description: string, featureSelection: SidebarOptions, icon: JSX.Element }) => (
    <div data-testid="mocked-feature-card">
      <span>{title} - {description} - {featureSelection}</span> - {icon}
    </div>
  ),
  TextFieldCard: () => <div data-testid="mocked-text-field-card">Mocked TextFieldCard</div>
}))

jest.mock('@fluentui/react-icons', () => ({
  NewsRegular: ({ style }: { style: React.CSSProperties }) => (
      <div data-testid="mocked-news-icon" style={style}>News Icon</div>
  ),
  BookRegular: () => <div data-testid="mocked-book-icon">Book Icon</div>,
  NotepadRegular: () => <div data-testid="mocked-notepad-icon">Notepad Icon</div>
}))

jest.mock('@fluentui/react-components', () => ({
  Body1Strong: ({ children }: { children: React.ReactNode }) => <div data-testid="mocked-body1strong">{children}</div>
}))

jest.mock('../../components/SidebarView/SidebarView', () => ({
  SidebarOptions: {
    Article: 'Article',
    Grant: 'Grant',
    DraftDocuments: 'DraftDocuments'
  }
}))
describe('Homepage Component', () => {
  beforeEach(() => {
    // Mock window.matchMedia
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width:320px)',
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  })
  test('renders Homepage component correctly', () => {
    render(<Homepage />)

    // Check if the main elements are rendered
    expect(screen.getByAltText('App Icon')).toBeInTheDocument()
    expect(screen.getByText('Grant')).toBeInTheDocument()
    expect(screen.getByText('Writer')).toBeInTheDocument()
    expect(screen.getByText('AI-powered assistant for research acceleration')).toBeInTheDocument()

    // Check if the mocked TextFieldCard is rendered
    expect(screen.getByTestId('mocked-text-field-card')).toBeInTheDocument()

    // Check if the mocked FeatureCards are rendered with correct props
    expect(screen.getByText('Explore scientific journals - Explore the PubMed article database for relevant scientific data - Article')).toBeInTheDocument()
    expect(screen.getByText('Explore grant opportunities - Explore the PubMed grant database for available announcements - Grant')).toBeInTheDocument()
    expect(screen.getByText('Draft a grant proposal - Assist in writing a comprehesive grant proposal for your research project - DraftDocuments')).toBeInTheDocument()
  })

  test('renders correctly with large screen size', () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width:480px)',
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
    render(<Homepage />)

    // Check if the NewsRegular icon has the correct style for large screens
    const newsIcon = screen.getByTestId('mocked-news-icon')
    expect(newsIcon).toHaveStyle({ minWidth: '48px', minHeight: '48px' })
  })

  test('renders correctly with small screen size', () => {
    // Mock window.matchMedia to return true for small screen size
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width:320px)',
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))

    render(<Homepage />)

    // Check if the NewsRegular icon has the correct style for small screens
    const newsIcon = screen.getByTestId('mocked-news-icon')
    expect(newsIcon).toHaveStyle({ minWidth: '1rem', minHeight: '1rem' })
  })
})
