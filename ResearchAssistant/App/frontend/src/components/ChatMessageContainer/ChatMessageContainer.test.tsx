import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChatMessageContainer, { parseCitationFromMessage } from './ChatMessageContainer'

import { type ChatMessage } from '../../api'

jest.mock('remark-supersub', () => () => {})
jest.mock('remark-gfm', () => () => {})
jest.mock('rehype-raw', () => () => {})
jest.mock('../Answer', () => ({
  Answer: jest.fn((props: any) => <div>
        <p>{props.answer.answer}</p>
        <span>Mock Answer Component</span>
        {props.answer.answer === 'Generating answer...'
          ? <button onClick={() => props.onCitationClicked()}>Mock Citation Loading</button>
          : <button onClick={() => props.onCitationClicked({ title: 'Test Citation' })}>Mock Citation</button>
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

  const nullMessage: ChatMessage = {
    role: '',
    content: 'Null role message',
    id: '4',
    date: ''
  }
  it('renders user messages correctly', () => {
    render(<ChatMessageContainer messages={[userMessage]} onShowCitation={mockOnShowCitation} showLoadingMessage={false} />)
    expect(screen.getByText('User message')).toBeInTheDocument()
  })

  it('renders assistant messages correctly', () => {
    render(<ChatMessageContainer messages={[assistantMessage]} onShowCitation={mockOnShowCitation} showLoadingMessage={false} />)
    expect(screen.getByText('Assistant message')).toBeInTheDocument()
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

  it('handles null role messages correctly', () => {
    render(<ChatMessageContainer messages={[nullMessage]} onShowCitation={mockOnShowCitation} showLoadingMessage={false} />)
    expect(screen.queryByText('Null role message')).not.toBeInTheDocument()
  })
})
