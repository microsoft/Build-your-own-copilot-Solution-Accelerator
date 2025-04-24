import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AuthNotConfigure } from './AuthNotConfigure'
import styles from '../Chat.module.css'

// Mock the Fluent UI icons
jest.mock('@fluentui/react-icons', () => ({
  ShieldLockRegular: () => <div data-testid="shield-lock-icon" />
}))

describe('AuthNotConfigure Component', () => {
  it('renders without crashing', () => {
    render(<AuthNotConfigure />)

    // Check that the icon is rendered
    const icon = screen.getByTestId('shield-lock-icon')
    expect(icon).toBeInTheDocument()

    // Check that the titles and subtitles are rendered
    expect(screen.getByText('Authentication Not Configured')).toBeInTheDocument()
    expect(screen.getByText(/This app does not have authentication configured./)).toBeInTheDocument()

    // Check the strong text is rendered
    expect(screen.getByText('Authentication configuration takes a few minutes to apply.')).toBeInTheDocument()
    expect(screen.getByText(/please wait and reload the page after 10 minutes/i)).toBeInTheDocument()
  })

  it('renders the Azure portal and instructions links with correct href', () => {
    render(<AuthNotConfigure />)

    // Check the Azure Portal link
    const azurePortalLink = screen.getByText('Azure Portal')
    expect(azurePortalLink).toBeInTheDocument()
    expect(azurePortalLink).toHaveAttribute('href', 'https://portal.azure.com/')
    expect(azurePortalLink).toHaveAttribute('target', '_blank')

    // Check the instructions link
    const instructionsLink = screen.getByText('these instructions')
    expect(instructionsLink).toBeInTheDocument()
    expect(instructionsLink).toHaveAttribute(
      'href',
      'https://learn.microsoft.com/en-us/azure/app-service/scenario-secure-app-authentication-app-service#3-configure-authentication-and-authorization'
    )
    expect(instructionsLink).toHaveAttribute('target', '_blank')
  })

  
})
