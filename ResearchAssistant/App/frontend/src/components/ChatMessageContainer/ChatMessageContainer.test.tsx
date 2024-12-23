import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatMessageContainer, parseCitationFromMessage } from './ChatMessageContainer'
import { type ChatMessage } from '../../api/models'
import { Answer } from '../Answer'
jest.mock('remark-supersub', () => () => {})
jest.mock('remark-gfm', () => () => {})
jest.mock('rehype-raw', () => () => {})
jest.mock('../Answer/Answer', () => ({
  Answer: jest.fn((props: any) => <div>
        <p>{props.answer.answer}</p>
        <span>Mock Answer Component</span>
        {props.answer.answer == 'Generating answer...'
          ? <button onClick={() => props.onCitationClicked()}>Mock Citation Loading</button>
          : <button aria-label="citationButton" onClick={() => props.onCitationClicked({ title: 'Test Citation' })}>Mock Citation</button>
        }

    </div>)
}))

const mockOnShowCitation = jest.fn()

describe('ChatMessageContainer', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    jest.spyOn(console, 'error').mockImplementation(() => { })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const userMessage: ChatMessage = {
    role: 'user',
    content: 'User message',
    id: '1',
    date: new Date().toDateString()
  }

  const assistantMessage: ChatMessage = {
    role: 'assistant',
    content: 'Assistant message',
    id: '2',
    date: new Date().toDateString()
  }

  const errorMessage: ChatMessage = {
    role: 'error',
    content: 'Error message',
    id: '3',
    date: new Date().toDateString()
  }

  it('renders user and assistant messages correctly', () => {
    render(
            <ChatMessageContainer
                messages={[userMessage, assistantMessage]}
                showLoadingMessage={false}
                onShowCitation={mockOnShowCitation}
            />
    )

    // Check if user message is displayed
    expect(screen.getByText('User message')).toBeInTheDocument()
    screen.debug()
    // Check if assistant message is displayed via Answer component
    expect(screen.getByText('Mock Answer Component')).toBeInTheDocument()
    expect(Answer).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: {
          answer: 'Assistant message',
          citations: []
        }
      }),
      {}
    )
  })

  it('renders an error message correctly', () => {
    render(
            <ChatMessageContainer
                messages={[errorMessage]}

                showLoadingMessage={false}
                onShowCitation={mockOnShowCitation}
            />
    )

    // Check if error message is displayed with the error icon
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('displays the loading message when showLoadingMessage is true', () => {
    render(
            <ChatMessageContainer
                messages={[]}

                showLoadingMessage={true}
                onShowCitation={mockOnShowCitation}
            />
    )
    // Check if the loading message is displayed via Answer component
    expect(screen.getByText('Generating answer...')).toBeInTheDocument()
  })

  it('calls onShowCitation when a citation is clicked', () => {
    render(
            <ChatMessageContainer
                messages={[assistantMessage]}
                showLoadingMessage={false}
                onShowCitation={mockOnShowCitation}
            />
    )

    // Simulate a citation click
    const citationButton = screen.getByText('Mock Citation')
    fireEvent.click(citationButton)

    // Check if onShowCitation is called with the correct argument
    expect(mockOnShowCitation).toHaveBeenCalledWith({ title: 'Test Citation' })
  })

  test('does not call onShowCitation when citation click is a no-op', () => {
    render(
            <ChatMessageContainer
                messages={[]}
                showLoadingMessage={true}
                onShowCitation={mockOnShowCitation} // No-op function
            />
    )
    // Simulate a citation click
    const citationButton = screen.getByRole('button', { name: 'Mock Citation Loading' })
    fireEvent.click(citationButton)

    // Check if onShowCitation is NOT called
    expect(mockOnShowCitation).not.toHaveBeenCalled()
  })

  test('calls onShowCitation when citation button is clicked', async () => {
    render(<ChatMessageContainer messages={[userMessage, assistantMessage]} onShowCitation={mockOnShowCitation} showLoadingMessage={false} />)
    const buttonEle = await screen.findByRole('button', { name: 'citationButton' })
    fireEvent.click(buttonEle)
    expect(mockOnShowCitation).toHaveBeenCalledWith({ title: 'Test Citation' })
  })

  test('does not call onCitationClicked when citation button is clicked', async () => {
    const mockOnCitationClicked = jest.fn()
    render(<ChatMessageContainer messages={[userMessage, assistantMessage]} onShowCitation={mockOnShowCitation} showLoadingMessage={false} />)
    const buttonEle = await screen.findByRole('button', { name: 'citationButton' })
    fireEvent.click(buttonEle)
    expect(mockOnCitationClicked).not.toHaveBeenCalled()
  })

  it('returns citations when message role is "tool" and content is valid JSON', () => {
    const message: ChatMessage = {
      role: 'tool',
      content: JSON.stringify({ citations: [{ filepath: 'path/to/file', chunk_id: '1' }] }),
      id: '1',
      date: ''
    }
    const citations = parseCitationFromMessage(message)
    expect(citations).toEqual([{ filepath: 'path/to/file', chunk_id: '1' }])
  })
  it('returns an empty array when message role is "tool" and content is invalid JSON', () => {
    const message: ChatMessage = {
      role: 'tool',
      content: 'invalid JSON',
      id: '1',
      date: ''
    }
    const citations = parseCitationFromMessage(message)
    expect(citations).toEqual([])
  })
  it('returns an empty array when message role is not "tool"', () => {
    const message: ChatMessage = {
      role: 'user',
      content: JSON.stringify({ citations: [{ filepath: 'path/to/file', chunk_id: '1' }] }),
      id: '1',
      date: ''
    }
    const citations = parseCitationFromMessage(message)
    expect(citations).toEqual([])
  })
})
