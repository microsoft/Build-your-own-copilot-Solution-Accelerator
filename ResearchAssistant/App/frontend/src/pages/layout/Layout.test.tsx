import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from './Layout';
import { SidebarOptions } from '../../components/SidebarView/SidebarView';
import { AppStateContext } from '../../state/AppProvider';
import { MemoryRouter } from 'react-router-dom'; 
import { DraftDocumentsView } from '../../components/DraftDocumentsView/DraftDocumentsView';
// Mock child components
jest.mock('../../components/SidebarView/SidebarView', () => ({
  SidebarView: () => <div>Mocked SidebarView</div>,
  SidebarOptions: {
    DraftDocuments: 'DraftDocuments',
    Grant: 'Grant',
    Article: 'Article',
  },
}));

jest.mock('../Homepage/Homepage', () => () => <div>Mocked Homepage</div>);
jest.mock('../chat/Chat', () => ({ chatType }: { chatType: SidebarOptions }) => (
  <div>Mocked Chat Component for {chatType}</div>
));
jest.mock('../../components/DraftDocumentsView/DraftDocumentsView', () => ({
  DraftDocumentsView: () => <div>Mocked DraftDocumentsView</div>,
}));


// Mock the SVG and CSS modules to avoid errors during testing
jest.mock('../../assets/M365.svg', () => 'mocked-icon');
jest.mock('./Layout.module.css', () => ({}));

describe('Layout Component', () => {
  const mockDispatch = jest.fn();
  
  const initialState = {
    sidebarSelection: SidebarOptions.Article,
    isSidebarExpanded: true,
  };

  const renderWithContext = (state: any) => {
    return render(
      <MemoryRouter>
        <AppStateContext.Provider value={{ state, dispatch: mockDispatch }}>
          <Layout />
        </AppStateContext.Provider>
      </MemoryRouter>
    );
  };

  it('renders Homepage by default when no sidebarSelection is made', () => {
    const noSelectionState = { ...initialState, sidebarSelection: null };
    renderWithContext(noSelectionState);
    expect(screen.getByText('Mocked Homepage')).toBeInTheDocument();
  });

  test('renders DraftDocumentsView when sidebarSelection is DraftDocuments', () => {
    renderWithContext({ sidebarSelection: SidebarOptions.DraftDocuments });
    expect(screen.getByText('Mocked DraftDocumentsView')).toBeInTheDocument();
  });

  it('renders Chat component for Grant when sidebarSelection is Grant', () => {
    const grantState = { ...initialState, sidebarSelection: SidebarOptions.Grant };
    renderWithContext(grantState);
    expect(screen.getByText('Mocked Chat Component for Grant')).toBeInTheDocument();
  });

  it('renders Chat component for Article when sidebarSelection is Article', () => {
    const articleState = { ...initialState, sidebarSelection: SidebarOptions.Article };
    renderWithContext(articleState);
    expect(screen.getByText('Mocked Chat Component for Article')).toBeInTheDocument();
  });

  it('dispatches actions when Link is clicked', () => {
    renderWithContext(initialState);
    const link = screen.getByRole('link', { name: /Grant Writer/i });
    fireEvent.click(link);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'UPDATE_SIDEBAR_SELECTION', payload: null });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });
  });
});
