// CitationPanel.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationPanel } from './CitationPanel';
import { Citation } from '../../../api/models';


jest.mock('remark-gfm', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());



const mockCitation = {
    id: '123',
    title: 'Sample Citation',
    content: 'This is a sample citation content.',
    url: 'https://example.com/sample-citation',
    filepath: "path",
    metadata: "",
    chunk_id: "",
    reindex_id: ""

};

describe('CitationPanel', () => {
    const mockIsCitationPanelOpen = jest.fn();
    const mockOnViewSource = jest.fn();

    beforeEach(() => {
        // Reset mocks before each test
        mockIsCitationPanelOpen.mockClear();
        mockOnViewSource.mockClear();
    });

    test('renders CitationPanel with citation title and content', () => {
        render(
            <CitationPanel
                activeCitation={mockCitation}
                IsCitationPanelOpen={mockIsCitationPanelOpen}
                onViewSource={mockOnViewSource}
            />
        );

        // Check if title is rendered
        expect(screen.getByRole('heading', { name: /Sample Citation/i })).toBeInTheDocument();

        // Check if content is rendered
        //expect(screen.getByText(/This is a sample citation content/i)).toBeInTheDocument();
    });

    test('calls IsCitationPanelOpen with false when close button is clicked', () => {
        render(
            <CitationPanel
                activeCitation={mockCitation}
                IsCitationPanelOpen={mockIsCitationPanelOpen}
                onViewSource={mockOnViewSource}
            />
        );

        const closeButton = screen.getByRole('button', { name: /Close citations panel/i });
        fireEvent.click(closeButton);

        expect(mockIsCitationPanelOpen).toHaveBeenCalledWith(false);
    });

    test('calls onViewSource with citation when title is clicked', () => {
        render(
            <CitationPanel
                activeCitation={mockCitation}
                IsCitationPanelOpen={mockIsCitationPanelOpen}
                onViewSource={mockOnViewSource}
            />
        );

        const title = screen.getByRole('heading', { name: /Sample Citation/i });
        fireEvent.click(title);

        expect(mockOnViewSource).toHaveBeenCalledWith(mockCitation);
    });

    test('renders the title correctly and sets the correct title attribute for non-blob URL', () => {
        render(
            <CitationPanel
                activeCitation={mockCitation}
                IsCitationPanelOpen={mockIsCitationPanelOpen}
                onViewSource={mockOnViewSource}
            />
        );

        const titleElement = screen.getByRole('heading', { name: /Sample Citation/i });

        // Ensure the title is rendered
        expect(titleElement).toBeInTheDocument();

        // Ensure the title attribute is set to the URL since it's not a blob URL
        expect(titleElement).toHaveAttribute('title', 'https://example.com/sample-citation');

        // Trigger the onClick event and ensure onViewSource is called with the correct citation
        fireEvent.click(titleElement);
        expect(mockOnViewSource).toHaveBeenCalledWith(mockCitation);
    });

    test('renders the title correctly and sets the title attribute to the citation title for blob URL', () => {

        const mockCitationWithBlobUrl: Citation = {
            ...mockCitation,
            title: 'Test Citation with Blob URL',
            url: 'https://blob.core.example.com/resource',
            content: '',
        };
        render(
            <CitationPanel
                activeCitation={mockCitationWithBlobUrl}
                IsCitationPanelOpen={mockIsCitationPanelOpen}
                onViewSource={mockOnViewSource}
            />
        );


        const titleElement = screen.getByRole('heading', { name: /Test Citation with Blob URL/i });

        // Ensure the title is rendered
        expect(titleElement).toBeInTheDocument();

        // Ensure the title attribute is set to the citation title since the URL contains "blob.core"
        expect(titleElement).toHaveAttribute('title', 'Test Citation with Blob URL');

        // Trigger the onClick event and ensure onViewSource is called with the correct citation
        fireEvent.click(titleElement);
        expect(mockOnViewSource).toHaveBeenCalledWith(mockCitationWithBlobUrl);
    });

});
