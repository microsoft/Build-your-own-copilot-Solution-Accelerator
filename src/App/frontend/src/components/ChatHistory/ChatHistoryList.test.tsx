import React from 'react'
import { renderWithContext, screen, waitFor, fireEvent, act } from '../../test/test.utils';
import { ChatHistoryList } from './ChatHistoryList'
import {groupByMonth} from '../../helpers/helpers';

// Mock the groupByMonth function
jest.mock('../../helpers/helpers', () => ({
  groupByMonth: jest.fn(),
}));

// Mock ChatHistoryListItemGroups component
jest.mock('./ChatHistoryListItem', () => ({
  ChatHistoryListItemGroups: jest.fn(() => <div>Mocked ChatHistoryListItemGroups</div>),
}));

describe('ChatHistoryList', () => {

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

  it('should display "No chat history." when chatHistory is empty', () => {
    renderWithContext(<ChatHistoryList />);

    expect(screen.getByText('No chat history.')).toBeInTheDocument();
  });

  it('should call groupByMonth with chatHistory when chatHistory is present', () => {
    const mockstate = {
        chatHistory : [{
            id: '1',
            title: 'Sample chat message',
            messages:[],
            date:new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }]
      };
    (groupByMonth as jest.Mock).mockReturnValue([]);
    renderWithContext(<ChatHistoryList /> , mockstate);

    expect(groupByMonth).toHaveBeenCalledWith(mockstate.chatHistory);
  });

  it('should render ChatHistoryListItemGroups with grouped chat history when chatHistory is present', () => {
     const mockstate = {
        chatHistory : [{
            id: '1',
            title: 'Sample chat message',
            messages:[],
            date:new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }]
      };
    (groupByMonth as jest.Mock).mockReturnValue([]);
    renderWithContext(<ChatHistoryList /> , mockstate);

    expect(screen.getByText('Mocked ChatHistoryListItemGroups')).toBeInTheDocument();
  });
});
