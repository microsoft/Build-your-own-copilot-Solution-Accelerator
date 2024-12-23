import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppStateContext } from '../../../state/AppProvider';
import { GrantView } from './GrantView';
import { Citation } from '../../../api/models';
const citationWithNoTitleOrUrl: Citation = {
    id: '4',
    title: '',
    type: 'Grants',
    url: '',
    content: 'Content with no title or URL',
    filepath: '/path/to/file',
    metadata: " ",
    chunk_id: 'chunk4',
    reindex_id: 'reindex4',
  };
  
  const mockDispatch = jest.fn();
  
  const appStateWithEmptyTitleAndUrl = {
    state: {
      favoritedCitations: [citationWithNoTitleOrUrl],
      currentChat: null,
      articlesChat: null,
      grantsChat: null,
      frontendSettings: null,
      documentSections: null,
      researchTopic: '',
      isSidebarExpanded: false,
      isChatViewOpen: true,
      sidebarSelection: null,
      showInitialChatMessage: true,
    },
    dispatch: mockDispatch,
  };
  
// Create full Citation mock data
const grantCitation: Citation = {
  id: '1',
  title: 'Grant 1 Title',
  type: 'Grants',
  url: 'http://grant1.com',
  content: 'Grant content',
  filepath: '/path/to/file',
  metadata: " ",
  chunk_id: 'chunk1',
  reindex_id: 'reindex1',
};

const otherCitation: Citation = {
  id: '2',
  title: 'Other Title',
  type: 'Other',
  url: 'http://other.com',
  content: 'Other content',
  filepath: '/path/to/file',
  metadata: " ",
  chunk_id: 'chunk2',
  reindex_id: 'reindex2',
};

const longTitleCitation: Citation = {
  id: '3',
  title: 'This is a very long title that should be truncated',
  type: 'Grants',
  url: 'http://longtitle.com',
  content: 'Long title content',
  filepath: '/path/to/file',
  metadata: " ",
  chunk_id: 'chunk3',
  reindex_id: 'reindex3',
};



const mockAppStateWithGrants = {
  state: {
    favoritedCitations: [grantCitation, longTitleCitation],
    currentChat: null,
    articlesChat: null,
    grantsChat: null,
    frontendSettings: null,
    documentSections: null,
    researchTopic: '',
    isSidebarExpanded: false,
    isChatViewOpen: true,
    sidebarSelection: null,
    showInitialChatMessage: true,
  },
  dispatch: mockDispatch,
};

const mockAppStateWithoutGrants = {
  state: {
    favoritedCitations: [otherCitation],
    currentChat: null,
    articlesChat: null,
    grantsChat: null,
    frontendSettings: null,
    documentSections: null,
    researchTopic: '',
    isSidebarExpanded: false,
    isChatViewOpen: true,
    sidebarSelection: null,
    showInitialChatMessage: true,
  },
  dispatch: mockDispatch,
};

describe('GrantView', () => {
  it('renders grant citations only', () => {
    render(
      <AppStateContext.Provider value={mockAppStateWithGrants}>
        <GrantView />
      </AppStateContext.Provider>
    );

    // Verify that only grant citations are rendered
    expect(screen.getByText('Grant 1 Title')).toBeInTheDocument();
    expect(screen.queryByText('Other Title')).not.toBeInTheDocument();
    expect(screen.getByText((content) => content.startsWith('This is a very long'))).toBeInTheDocument();
  });

  it('renders message when no grant citations are available', () => {
    render(
      <AppStateContext.Provider value={mockAppStateWithoutGrants}>
        <GrantView />
      </AppStateContext.Provider>
    );

    // Verify that no grant citations are rendered
    expect(screen.queryByText('Grant 1 Title')).not.toBeInTheDocument();
    expect(screen.queryByText('This is a very long title that should be truncated')).not.toBeInTheDocument();
    // You can add a message for no grants, or leave this as it is
  });

  it('removes a citation when the remove button is clicked', () => {
    render(
      <AppStateContext.Provider value={mockAppStateWithGrants}>
        <GrantView />
      </AppStateContext.Provider>
    );

    // Click the first remove button
    const removeButton = screen.getAllByTitle('remove')[0];
    fireEvent.click(removeButton);

    // Verify that the correct dispatch action is called
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_FAVORITE_CITATION',
      payload: { citation: grantCitation },
    });
  });

  it('dispatches the TOGGLE_SIDEBAR action when close button is clicked', () => {
    render(
      <AppStateContext.Provider value={mockAppStateWithGrants}>
        <GrantView />
      </AppStateContext.Provider>
    );

    // Click the close button
    const closeButton = screen.getByTitle('close');
    fireEvent.click(closeButton);

    // Verify that the dispatch action is called
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
  });
  it('renders correctly when no grants citations are available', () => {
    const emptyAppState = {
      ...mockAppStateWithoutGrants,
      state: { ...mockAppStateWithoutGrants.state, favoritedCitations: [] },
    };
    render(
      <AppStateContext.Provider value={emptyAppState}>
        <GrantView />
      </AppStateContext.Provider>
    );
  
    // Check that nothing is displayed when there are no grants
    expect(screen.queryByText('Grant 1 Title')).not.toBeInTheDocument();
    expect(screen.queryByText('This is a very long title that should be truncated')).not.toBeInTheDocument();
    // Optionally check if you want to render a specific message when no grants are found
  });
  
  it('dispatches the TOGGLE_SIDEBAR action when close button is clicked', () => {
    render(
      <AppStateContext.Provider value={appStateWithEmptyTitleAndUrl}>
        <GrantView />
      </AppStateContext.Provider>
    );

    // Simulate clicking the close button
    const closeButton = screen.getByTitle('close');
    fireEvent.click(closeButton);

    // Check if the TOGGLE_SIDEBAR action was dispatched
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
  });
  
  

  
});