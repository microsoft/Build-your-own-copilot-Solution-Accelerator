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
});
