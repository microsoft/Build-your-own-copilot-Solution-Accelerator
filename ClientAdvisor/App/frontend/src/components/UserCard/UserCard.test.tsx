import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserCard } from './UserCard';
import { Icon } from '@fluentui/react/lib/Icon';

// Mocking the Fluent UI Icon component (if needed)
jest.mock('@fluentui/react/lib/Icon', () => ({
  Icon: () => <span data-testid="icon"></span>,
}));

const mockProps = {
  ClientId: 1,
  ClientName: 'John Doe',
  NextMeeting: '10th October, 2024',
  NextMeetingTime: '10:00 AM',
  NextMeetingEndTime: '11:00 AM',
  AssetValue: '100,000',
  LastMeeting: '5th October, 2024',
  LastMeetingStartTime: '9:00 AM',
  LastMeetingEndTime: '10:00 AM',
  ClientSummary: 'A summary of the client details.',
  onCardClick: jest.fn(),
  isSelected: false,
  isNextMeeting: true,
  chartUrl: '/path/to/chart',
};

describe('UserCard Component', () => {
  it('renders user card with basic details', () => {
    render(<UserCard {...mockProps} />);
    
    expect(screen.getByText(mockProps.ClientName)).toBeInTheDocument();
    expect(screen.getByText(mockProps.NextMeeting)).toBeInTheDocument();
    expect(screen.getByText(`${mockProps.NextMeetingTime} - ${mockProps.NextMeetingEndTime}`)).toBeInTheDocument();
    expect(screen.getByText('More details')).toBeInTheDocument();
    expect(screen.getAllByTestId('icon')).toHaveLength(2); 
  });

  it('handles card click correctly', () => {
    render(<UserCard {...mockProps} />);
    fireEvent.click(screen.getByText(mockProps.ClientName));
    expect(mockProps.onCardClick).toHaveBeenCalled();
  });

  it('toggles show more details on button click', () => {
    render(<UserCard {...mockProps} />);
    const showMoreButton = screen.getByText('More details');
    fireEvent.click(showMoreButton);
    expect(screen.getByText('Asset Value')).toBeInTheDocument();
    expect(screen.getByText('Less details')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Less details'));
    expect(screen.queryByText('Asset Value')).not.toBeInTheDocument();
  });

  it('handles keydown event for show more/less details', () => {
    render(<UserCard {...mockProps} />);
    const showMoreButton = screen.getByText('More details');
    fireEvent.keyDown(showMoreButton, { key: ' ', code: 'Space' }); // Testing space key for show more
    expect(screen.getByText('Asset Value')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByText('Less details'), { key: 'Enter', code: 'Enter' }); // Testing enter key for less details
    expect(screen.queryByText('Asset Value')).not.toBeInTheDocument();
  });

  it('handles keydown event for card click (Enter)', () => {
    render(<UserCard {...mockProps} />);
    const card = screen.getByText(mockProps.ClientName);
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' }); // Testing Enter key for card click
    expect(mockProps.onCardClick).toHaveBeenCalled();
  });

  it('handles keydown event for card click Space', () => {
    render(<UserCard {...mockProps} />);
    const card = screen.getByText(mockProps.ClientName);
    
    fireEvent.keyDown(card, { key: ' ', code: 'Space' }); // Testing Space key for card click
    expect(mockProps.onCardClick).toHaveBeenCalledTimes(3); // Check if it's been called twice now
  });


  it('adds selected class when isSelected is true', () => {
    render(<UserCard {...mockProps} isSelected={true} />);
    const card = screen.getByText(mockProps.ClientName).parentElement;
    expect(card).toHaveClass('selected');
  });

});

// Fix for the isolatedModules error
export {};
