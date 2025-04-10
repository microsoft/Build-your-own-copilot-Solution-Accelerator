// PowerBIChart.test.tsx
import { render, screen } from '@testing-library/react';
import PowerBIChart from './PowerBIChart';

describe('PowerBIChart Component', () => {
  const chartUrl = 'https://example.com/chart';

  test('renders the PowerBIChart component', () => {
    render(<PowerBIChart chartUrl={chartUrl} />);
    
    // Check if the iframe is present in the document
    const iframe = screen.getByTitle('PowerBI Chart');
    expect(iframe).toBeInTheDocument();
  });

  test('iframe has the correct src attribute', () => {
    render(<PowerBIChart chartUrl={chartUrl} />);
    
    // Check if the iframe has the correct src attribute
    const iframe = screen.getByTitle('PowerBI Chart') as HTMLIFrameElement;
    expect(iframe).toHaveAttribute('src', chartUrl);
  });

  test('iframe container has the correct styles applied', () => {
    render(<PowerBIChart chartUrl={chartUrl} />);
    
    // Check if the div containing the iframe has the correct styles
    const containerDiv = screen.getByTitle('PowerBI Chart').parentElement;
    expect(containerDiv).toHaveStyle('height: 100vh');
    expect(containerDiv).toHaveStyle('max-height: calc(100vh - 300px)');
  });
});
