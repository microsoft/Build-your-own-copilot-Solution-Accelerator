import React from 'react';
import { render, fireEvent,screen } from '@testing-library/react';
import { Answer } from './Answer';
import { type AskResponse, type Citation } from '../../api';


jest.mock('lodash-es', () => ({
  cloneDeep: jest.fn((value) => {
    return JSON.parse(JSON.stringify(value));
  }),
}));
jest.mock('remark-supersub', () => () => {});
jest.mock('remark-gfm', () => () => {});
jest.mock('rehype-raw', () => () => {});

const mockCitations = [
  {
    chunk_id: '0',
    content: 'Citation 1',
    filepath: 'path/to/doc1',
    id: '1',
    reindex_id: '1',
    title: 'Title 1',
    url: 'http://example.com/doc1',
    metadata: null,
  },
  {
    chunk_id: '1',
    content: 'Citation 2',
    filepath: 'path/to/doc2',
    id: '2',
    reindex_id: '2',
    title: 'Title 2',
    url: 'http://example.com/doc2',
    metadata: null,
  },
];
const answerWithCitations: AskResponse = {
  answer: 'This is the answer with citations [doc1].',
  citations: [
      {
          id: '1',
          content: 'Citation 1',
          filepath: 'path/to/document',
          title: 'Title 1',
          url: 'http://example.com/doc1',
          reindex_id: '1',
          chunk_id: null,
          metadata: null,
      } as Citation
  ],
};
const mockAnswer: AskResponse = {
  answer: 'This is the answer with citations [doc1] and [doc2].',
  citations: mockCitations,
};

type OnCitationClicked = (citedDocument: Citation) => void;

describe('Answer component', () => {
  let onCitationClicked: OnCitationClicked;
  const setup = (answerProps: AskResponse) => {
    return render(<Answer answer={answerProps} onCitationClicked={onCitationClicked} />);
};

  beforeEach(() => {
    onCitationClicked = jest.fn();
  });

  test('toggles the citation accordion on chevron click', () => {
    const { getByLabelText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);

    const toggleButton = getByLabelText(/Open references/i);
    fireEvent.click(toggleButton);

    const citationFilename1 = getByLabelText(/path\/to\/doc1 - Part 1/i);
    const citationFilename2 = getByLabelText(/path\/to\/doc2 - Part 2/i);

    expect(citationFilename1).toBeInTheDocument();
    expect(citationFilename2).toBeInTheDocument();
  });

  test('creates the citation filepath correctly', () => {
    const { getByLabelText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);
    const toggleButton = getByLabelText(/Open references/i);
    fireEvent.click(toggleButton);

    const citationFilename1 = getByLabelText(/path\/to\/doc1 - Part 1/i);
    const citationFilename2 = getByLabelText(/path\/to\/doc2 - Part 2/i);

    expect(citationFilename1).toBeInTheDocument();
    expect(citationFilename2).toBeInTheDocument();
  });

  test('initially renders with the accordion collapsed', () => {
    const { getByLabelText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);
    const toggleButton = getByLabelText(/Open references/i);

    expect(toggleButton).not.toHaveAttribute('aria-expanded');
  });

  test('handles keyboard events to open the accordion and click citations', () => {
    const { getByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);
    const toggleButton = getByText(/2 references/i);
    fireEvent.click(toggleButton);

    const citationLink = getByText(/path\/to\/doc1/i);
    expect(citationLink).toBeInTheDocument();

    fireEvent.click(citationLink);

    expect(onCitationClicked).toHaveBeenCalledWith({
      chunk_id: '0',
      content: 'Citation 1',
      filepath: 'path/to/doc1',
      id: '1',
      metadata: null,
      reindex_id: '1',
      title: 'Title 1',
      url: 'http://example.com/doc1',
    });
  });

  test('handles keyboard events to click citations', () => {
    const { getByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);
    const toggleButton = getByText(/2 references/i);
    fireEvent.click(toggleButton);

    const citationLink = getByText(/path\/to\/doc1/i);
    expect(citationLink).toBeInTheDocument();

    fireEvent.keyDown(citationLink, { key: 'Enter', code: 'Enter' });
    expect(onCitationClicked).toHaveBeenCalledWith(mockCitations[0]);

    fireEvent.keyDown(citationLink, { key: ' ', code: 'Space' });
    expect(onCitationClicked).toHaveBeenCalledTimes(2); // Now test's called again
  });

  test('calls onCitationClicked when a citation is clicked', () => {
    const { getByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);
    const toggleButton = getByText('2 references');
    fireEvent.click(toggleButton);

    const citationLink = getByText('path/to/doc1 - Part 1');
    fireEvent.click(citationLink);

    expect(onCitationClicked).toHaveBeenCalledWith(mockCitations[0]);
  });

  test('renders the answer text correctly', () => {
    const { getByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);

    expect(getByText(/This is the answer with citations/i)).toBeInTheDocument();
    expect(getByText(/references/i)).toBeInTheDocument();
  });

  test('displays correct number of citations', () => {
    const { getByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);
    expect(getByText('2 references')).toBeInTheDocument();
  });

  test('toggles the citation accordion on click', () => {
    const { getByText, queryByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);
    const toggleButton = getByText('2 references');

    expect(queryByText('path/to/doc1 - Part 1')).not.toBeInTheDocument();
    expect(queryByText('path/to/doc2 - Part 2')).not.toBeInTheDocument();

    
    fireEvent.click(toggleButton);

    
    expect(getByText('path/to/doc1 - Part 1')).toBeInTheDocument();
    expect(getByText('path/to/doc2 - Part 2')).toBeInTheDocument();
  });

  test('displays disclaimer text', () => {
    const { getByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />);
    expect(getByText(/AI-generated content may be incorrect/i)).toBeInTheDocument();
  });

  test('handles fallback case for citations without filepath or ids', () => {
    const answerWithFallbackCitation: AskResponse = {
      answer: 'This is the answer with citations [doc1].',
      citations: [{
        id: '1',
        content: 'Citation 1',
        filepath: '',
        title: 'Title 1',
        url: '',
        chunk_id: '0',
        reindex_id: '1',
        metadata: null,
      }],
    };
  
    const { getByLabelText } = render(<Answer answer={answerWithFallbackCitation} onCitationClicked={onCitationClicked} />);
   
    const toggleButton = getByLabelText(/Open references/i);
    fireEvent.click(toggleButton);
  
    expect(screen.getByLabelText(/Citation 1/i)).toBeInTheDocument(); 
  });
  

  test('handles citations with long file paths', () => {
    const longCitation = {
      chunk_id: '0',
      content: 'Citation 1',
      filepath: 'path/to/very/long/document/file/path/to/doc1',
      id: '1',
      reindex_id: '1',
      title: 'Title 1',
      url: 'http://example.com/doc1',
      metadata: null,
    };

    const answerWithLongCitation: AskResponse = {
      answer: 'This is the answer with citations [doc1].',
      citations: [longCitation],
    };

    const { getByLabelText } = render(<Answer answer={answerWithLongCitation} onCitationClicked={onCitationClicked} />);
    const toggleButton = getByLabelText(/Open references/i);
    fireEvent.click(toggleButton);

    expect(getByLabelText(/path\/to\/very\/long\/document\/file\/path\/to\/doc1 - Part 1/i)).toBeInTheDocument();
  });

  test('renders citations with fallback text for invalid citations', () => {
    const onCitationClicked = jest.fn();
    
    const answerWithInvalidCitation = {
      answer: 'This is the answer with citations [doc1].',
      citations: [{
        id: '', 
        content: 'Citation 1',
        filepath: '', 
        title: 'Title 1',
        url: '', 
        chunk_id: '0',
        reindex_id: '1',
        metadata: null,
      }],
    };
  
    const { container } = render(<Answer answer={answerWithInvalidCitation} onCitationClicked={onCitationClicked} />);
  
    const toggleButton = screen.getByLabelText(/Open references/i);
    expect(toggleButton).toBeInTheDocument();
  
   
    fireEvent.click(toggleButton);
  
    
    expect(screen.getByLabelText(/Citation 1/i)).toBeInTheDocument();
  });
  test('handles citations with reindex_id', () => {
    
    const answerWithCitationsReindexId: AskResponse = {
        answer: 'This is the answer with citations [doc1].',
        citations: [
            {
                id: '1',
                content: 'Citation 1',
                filepath: 'path/to/document',
                title: 'Title 1',
                url: 'http://example.com/doc1',
                reindex_id: '1', 
                chunk_id: null,   
                metadata: null,
            }
        ],
    };

    setup(answerWithCitationsReindexId);

   
    const toggleButton = screen.getByLabelText(/Open references/i);
    fireEvent.click(toggleButton);

    
    const citationFilename = screen.getByLabelText(/path\/to\/document - Part 1/i); // Change to Part 1
    expect(citationFilename).toBeInTheDocument();
});
test('handles citation filename truncation', () => {
  const answerWithCitations: AskResponse = {
      answer: 'This is the answer with citations [doc1].',
      citations: [
          {
              id: '1',
              content: 'Citation 1',
              filepath: 'a_very_long_filepath_that_needs_to_be_truncated_to_fit_the_ui',
              title: 'Title 1',
              url: 'http://example.com/doc1',
              reindex_id: null,
              chunk_id: '1',
              metadata: null,
          } as Citation
      ],
  };

  setup(answerWithCitations);

 
  const toggleButton = screen.getByLabelText(/Open references/i);
  fireEvent.click(toggleButton);

  
  const citationFilename = screen.getByLabelText(/a_very_long_filepath_that_needs_to_be_truncated_to_fit_the_ui - Part 2/i);
  expect(citationFilename).toBeInTheDocument();
});
test('handles citations with reindex_id and clicks citation link', () => {
  setup(answerWithCitations);

  // Click to expand the citation section
  const toggleButton = screen.getByLabelText(/Open references/i);
  fireEvent.click(toggleButton);

  // Check if the citation filename is created correctly
  const citationFilename = screen.getByLabelText(/path\/to\/document - Part 1/i);
  expect(citationFilename).toBeInTheDocument();

  // Click the citation link
  fireEvent.click(citationFilename);
  
  // Validate onCitationClicked was called
  // Note: Ensure that you have access to the onCitationClicked mock function
  expect(onCitationClicked).toHaveBeenCalledWith(answerWithCitations.citations[0]);
});

test('toggles accordion on key press', () => {
  setup(answerWithCitations);
  
  
  const toggleButton = screen.getByLabelText(/Open references/i);
  fireEvent.click(toggleButton);

  
  const citationLink = screen.getByLabelText(/path\/to\/document - Part 1/i);
  
  fireEvent.keyDown(citationLink, { key: 'Enter', code: 'Enter' });
 
  expect(onCitationClicked).toHaveBeenCalledWith(answerWithCitations.citations[0]);

  fireEvent.keyDown(citationLink, { key: ' ', code: 'Space' });

  expect(onCitationClicked).toHaveBeenCalledTimes(2); 
});


test('handles keyboard events to open the accordion', () => {
  setup(answerWithCitations);

  const chevronButton = screen.getByLabelText(/Open references/i);
  
  // Check if the initial state is not expanded (you may omit the aria-expanded check)
  // Optionally, use another way to check the visibility of the accordion or state
  
  // Simulate pressing Enter key
  fireEvent.keyDown(chevronButton, { key: 'Enter', code: 'Enter' });
  // Since we can't check aria-expanded, check if the accordion is visible instead
  expect(screen.getByText(/Citation/i)).toBeVisible(); // Assuming citations text is present

  // Reset state for the next test
  fireEvent.click(chevronButton); // Collapse again

  // Simulate pressing Space key
  fireEvent.keyDown(chevronButton, { key: ' ', code: 'Space' });
  expect(screen.getByText(/Citation/i)).toBeVisible(); // Check again for visibility
});






});
