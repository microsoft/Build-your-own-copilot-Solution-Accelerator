import React from 'react';
import { renderWithContext, mockDispatch, defaultMockState } from '../../test/test.utils';
import { FeatureCard, TextFieldCard } from './Cards';  
import { screen, fireEvent } from '@testing-library/react';
import { SidebarOptions } from '../SidebarView/SidebarView'; 
import { TextField } from '@fluentui/react/lib/TextField';

// Mock icon for testing
const MockIcon = () => <div>Mock Icon</div>;

describe('FeatureCard', () => {
  const mockProps = {
    title: 'Test Feature',
    description: 'This is a test feature description',
    icon: <MockIcon />,
    featureSelection: SidebarOptions.Article,  
  };

  it('renders FeatureCard correctly', () => {
    renderWithContext(<FeatureCard {...mockProps} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('This is a test feature description')).toBeInTheDocument();
    expect(screen.getByText('Mock Icon')).toBeInTheDocument();
  });

  it('calls dispatch with correct payload when clicked', () => {
    renderWithContext(<FeatureCard {...mockProps} />);
    const cardElement = screen.getByText('Test Feature').closest('div');
    fireEvent.click(cardElement!);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SIDEBAR_SELECTION',
      payload: SidebarOptions.Article,
    });
  });
});

describe('TextFieldCard', () => {
  it('renders TextFieldCard with initial state', () => {
    renderWithContext(<TextFieldCard />);
    expect(screen.getByText('Topic')).toBeInTheDocument();
    expect(screen.getByText('Enter an initial prompt that will exist across all three modes, Articles, Grants, and Drafts.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Research Topic')).toHaveValue(defaultMockState.researchTopic);
  });

  it('updates research topic on text input', () => {
    const updatedTopic = 'New Research Topic';
    renderWithContext(<TextFieldCard />);
    const input = screen.getByPlaceholderText('Research Topic');

    fireEvent.change(input, { target: { value: updatedTopic } });
    
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_RESEARCH_TOPIC',
      payload: updatedTopic,
    });
  });
});
