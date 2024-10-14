// __mocks__/react-markdown.tsx

import React from 'react';

// Mock implementation of react-markdown
const mockNode = {
  children: [{ value: 'console.log("Test Code");' }]
};
const mockProps = { className: 'language-javascript' };

const ReactMarkdown: React.FC<{ children: React.ReactNode , components: any }> = ({ children,components }) => {
  return <div data-testid="reactMockDown">
    {components && components.code({ node: mockNode, ...mockProps })}
    {children}</div>; // Simply render the children
};

export default ReactMarkdown;
