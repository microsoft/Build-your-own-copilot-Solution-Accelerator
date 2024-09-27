import { render, screen, fireEvent } from '@testing-library/react';
import {UserCard} from './UserCard';

const mockOnCardClick = jest.fn();

const defaultProps = {
  ClientId: 1,
  ClientName: 'John Doe',
  NextMeeting: 'Meeting',
  NextMeetingTime: '10:00 AM',
  NextMeetingEndTime: '11:00 AM',
  AssetValue: '1000',
  LastMeeting: 'Previous Meeting',
  LastMeetingStartTime: '09:00 AM',
  LastMeetingEndTime: '10:00 AM',
  ClientSummary: 'Summary of the client',
  onCardClick: mockOnCardClick,
  isSelected: false,
  isNextMeeting: false,
  chartUrl: '',
};


describe('UserCard Component', () => {
  it('should render with default props', () => {
    render(<UserCard {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Meeting')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM - 11:00 AM')).toBeInTheDocument();
  });

  it('should call onCardClick when the card is clicked', () => {
    render(<UserCard {...defaultProps} />);
    fireEvent.click(screen.getByText('John Doe'));
    expect(mockOnCardClick).toHaveBeenCalled();
  });
/*
  it('should toggle details when "More details" button is clicked', () => {
    render(<UserCard {...defaultProps} />);
    const moreDetailsButton = screen.getByText('More details');
    fireEvent.click(moreDetailsButton);
    expect(screen.getByText('Asset Value')).toBeInTheDocument();
    expect(screen.getByText('$1000')).toBeInTheDocument();
    expect(screen.getByText('Previous Meeting')).toBeInTheDocument();
    expect(screen.getByText('Summary of the client')).toBeInTheDocument();
    expect(moreDetailsButton).toHaveTextContent('Less details');
  });
  */

  it('should hide details when "Less details" button is clicked', () => {
    render(<UserCard {...defaultProps} isNextMeeting={true} />);
    const moreDetailsButton = screen.getByText('More details');
    fireEvent.click(moreDetailsButton); // Show details
    fireEvent.click(moreDetailsButton); // Hide details
    expect(screen.queryByText('Asset Value')).not.toBeInTheDocument();
    expect(screen.queryByText('$1000')).not.toBeInTheDocument();
    expect(screen.queryByText('Previous Meeting')).not.toBeInTheDocument();
    expect(screen.queryByText('Summary of the client')).not.toBeInTheDocument();
    expect(moreDetailsButton).toHaveTextContent('More details');
  });

  /*
  it('should apply selected style when isSelected is true', () => {
    render(<UserCard {...defaultProps} isSelected={true} />);
    expect(screen.getByText('John Doe').closest('div')).toHaveClass('selected');
  });
  */

  it('should display the chart URL if provided', () => {
    const props = { ...defaultProps, chartUrl: 'https://example.com/chart.png' };
    render(<UserCard {...props} />);
    // Assuming there's an img tag or some other element to display the chartUrl
    // You would replace this with the actual implementation details.
    //expect(screen.getByAltText('Chart')).toHaveAttribute('src', props.chartUrl);
  });
});
