

import React from 'react';
import { renderWithContext, mockDispatch, defaultMockState } from '../../../test/test.utils';
import { ArticleView } from './ArticleView';
import { Citation } from '../../../api/models';
import { fireEvent } from '@testing-library/react';
import { RenderResult } from '@testing-library/react';

describe('ArticleView Component', () => {
  const mockCitation: Citation = {
    id: '1',
    type: 'Articles',
    title: 'Sample Article Title',
    url: 'http://example.com',
    content: 'Sample content',
    filepath: null,
    metadata: null,
    chunk_id: null,
    reindex_id: null,
  };

  const initialMockState = {
    ...defaultMockState,
    favoritedCitations: [mockCitation],
  };

  test('renders the "Favorites" header and close button', () => {
    const { getByText, getByTitle }: RenderResult = renderWithContext(<ArticleView />, initialMockState);

    expect(getByText('Favorites')).toBeInTheDocument();
    expect(getByTitle('close')).toBeInTheDocument();
  });

  test('displays only article citations', () => {
    const { getByText }: RenderResult = renderWithContext(<ArticleView />, initialMockState);

    expect(getByText('Sample Article Title')).toBeInTheDocument();
  });

  test('removes citation on click and dispatches an action', () => {
    const { getByLabelText, queryByText }: RenderResult = renderWithContext(<ArticleView />, initialMockState);

    const removeButton = getByLabelText('remove');
    fireEvent.click(removeButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_FAVORITE_CITATION',
      payload: { citation: mockCitation },
    });

  
    expect(queryByText('Sample Article Title')).not.toBeInTheDocument();
  });

  test('toggles the sidebar on close button click', () => {
    const { getByTitle }: RenderResult = renderWithContext(<ArticleView />, initialMockState);

    // Click the close button
    const closeButton = getByTitle('close');
    fireEvent.click(closeButton);

    // Verify that the dispatch was called to toggle the sidebar
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
  });

 
  test('renders multiple article citations', () => {
    const additionalCitation: Citation = {
      id: '2',
      type: 'Articles',
      title: 'Another Sample Article Title',
      url: 'http://example2.com',
      content: 'Sample content',
      filepath: null,
      metadata: null,
      chunk_id: null,
      reindex_id: null,
    };

    const multipleCitationsState = {
      ...defaultMockState,
      favoritedCitations: [mockCitation, additionalCitation],
    };

    const { getByText } = renderWithContext(<ArticleView />, multipleCitationsState);

    
    expect(getByText('Sample Article Title')).toBeInTheDocument();
    expect(getByText('Another Sample Article Title')).toBeInTheDocument();
  });
  test('truncates citation title after 5 words', () => {
    const longTitleCitation: Citation = {
      id: '5',
      type: 'Articles',
      title: 'This is a very long article title that exceeds five words',
      url: 'http://example.com',
      content: 'Sample content',
      filepath: null,
      metadata: null,
      chunk_id: null,
      reindex_id: null,
    };
  
    const stateWithLongTitleCitation = {
      ...defaultMockState,
      favoritedCitations: [longTitleCitation],
    };
  
    const { getByText } = renderWithContext(<ArticleView />, stateWithLongTitleCitation);
  
    // Ensure that the title is truncated after 5 words
    expect(getByText('This is a very long...')).toBeInTheDocument();
  });
  test('handles citation with no URL gracefully', () => {
    const citationWithoutUrl: Citation = {
      id: '4',
      type: 'Articles',
      title: 'Article with no URL',
      url: '', // No URL
      content: 'Sample content',
      filepath: null,
      metadata: null,
      chunk_id: null,
      reindex_id: null,
    };
  
    const stateWithCitationWithoutUrl = {
      ...defaultMockState,
      favoritedCitations: [citationWithoutUrl],
    };
  
    const { getByText, queryByRole } = renderWithContext(<ArticleView />, stateWithCitationWithoutUrl);
  
    
    expect(getByText('Article with no URL')).toBeInTheDocument();
  
   
    expect(queryByRole('link')).not.toBeInTheDocument();
  });
  
  

  test('handles citation with no title gracefully', () => {
    const citationWithoutTitle: Citation = {
      id: '3',
      type: 'Articles',
      title: '', // No title
      url: 'http://example3.com',
      content: 'Sample content',
      filepath: null,
      metadata: null,
      chunk_id: null,
      reindex_id: null,
    };
  
    const stateWithCitationWithoutTitle = {
      ...defaultMockState,
      favoritedCitations: [citationWithoutTitle],
    };
  
    const { container } = renderWithContext(<ArticleView />, stateWithCitationWithoutTitle);
  
    
    const citationTitle = container.querySelector('span.css-113')?.textContent;
    expect(citationTitle).toBeFalsy(); 
  });
  

});
