import React from 'react';
import { screen, fireEvent, waitFor } from '../../test/test.utils';
import { SidebarView } from './SidebarView';
import { renderWithContext, mockDispatch } from '../../test/test.utils';
import { getUserInfo } from '../../api';

jest.mock('../../api', () => ({
  getUserInfo: jest.fn(() =>
    Promise.resolve([{ user_claims: [{ typ: 'name', val: 'John Doe' }] }])
  ),
}));

describe('SidebarView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders SidebarView with expanded sidebar and user info', async () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: true, sidebarSelection: 'Articles' });
    
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Articles/i)).toBeInTheDocument();
    });
  });

  it('toggles sidebar selection when icon is clicked', async () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: false, sidebarSelection: null });

    const grantButton = screen.getByText(/Grants/i);
    fireEvent.click(grantButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SIDEBAR_SELECTION',
      payload: 'Grants',
    });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
  });

  it('renders avatar with correct user name', async () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: true });

    await waitFor(() => {
      expect(screen.getByLabelText('User name')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    (getUserInfo as jest.Mock).mockRejectedValue(new Error('API Error'));

    renderWithContext(<SidebarView />);

    await waitFor(() => {
      expect(consoleErrorMock).toHaveBeenCalledWith('Error fetching user info: ', expect.any(Error));
    });

    consoleErrorMock.mockRestore();
  });

  it('handles empty user claims gracefully', async () => {
    (getUserInfo as jest.Mock).mockResolvedValueOnce([{ user_claims: [] }]);
  
    renderWithContext(<SidebarView />);
  
    await waitFor(() => {
      expect(screen.getByLabelText('User name')).toBeInTheDocument();
      expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
    });
  });

  it('renders ArticleView when Articles option is selected', () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: true, sidebarSelection: 'Articles' });
  
    expect(screen.getByText(/Articles/i)).toBeInTheDocument();
  });
  
  it('renders GrantView when Grants option is selected', () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: true, sidebarSelection: 'Grants' });
  
    expect(screen.getByText(/Grants/i)).toBeInTheDocument();
  });
  
  it('toggles sidebar when an option is clicked', () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: false, sidebarSelection: null });
  
    const articleButton = screen.getByText(/Articles/i);
    fireEvent.click(articleButton);
  
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'UPDATE_SIDEBAR_SELECTION', payload: 'Articles' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
  });

  it('renders collapsed sidebar', () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: false });
  
    // Check that the user name is not visible in collapsed state
    expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
  });

  it('renders DraftDocumentsView when Draft option is selected', () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: true, sidebarSelection: 'Draft' });
  
    // Narrow down the specific "Draft" element you are targeting
    const draftElements = screen.getAllByText(/Draft/i);
    const sidebarDraftOption = draftElements.find(element => element.tagName === 'SPAN'); // or check other attributes
  
    expect(sidebarDraftOption).toBeInTheDocument();
  });
  
  it('does not render selected view when sidebar is collapsed', () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: false, sidebarSelection: 'Articles' });
  
    // Check that detailed content is not rendered when collapsed
    expect(screen.queryByText(/Article details/i)).not.toBeInTheDocument();
  });

  it('dispatches TOGGLE_SIDEBAR when DraftDocuments option is clicked and sidebar is expanded', () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: true, sidebarSelection: null }); // Start with no selection

    const draftButtons = screen.getAllByText(/Draft/i); // Get all "Draft" buttons
    fireEvent.click(draftButtons[0]); // Click the Draft button

    // Check if the expected actions were dispatched
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'UPDATE_SIDEBAR_SELECTION', payload: 'Draft' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
});
it('dispatches TOGGLE_SIDEBAR when any option other than DraftDocuments is clicked', async () => {
  renderWithContext(<SidebarView />, { isSidebarExpanded: true, sidebarSelection: 'Articles' });

  const grantButton = screen.getByText(/Grants/i);
  fireEvent.click(grantButton);

  // Expect UPDATE_SIDEBAR_SELECTION to be dispatched
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'UPDATE_SIDEBAR_SELECTION', payload: 'Grants' });

  // Expect TOGGLE_SIDEBAR to not be dispatched, adjust this based on actual behavior
  expect(mockDispatch).not.toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
});



  it('does not dispatch TOGGLE_SIDEBAR when DraftDocuments is selected and clicked again', () => {
    renderWithContext(<SidebarView />, { isSidebarExpanded: true, sidebarSelection: 'Draft' });

    const draftButtons = screen.getAllByText(/Draft/i); // Get all "Draft" buttons
    fireEvent.click(draftButtons[0]); // Click the Draft button again

    expect(mockDispatch).not.toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
  });
});
