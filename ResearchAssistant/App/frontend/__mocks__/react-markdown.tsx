
import React from 'react';
 
// Mock implementation of react-markdown
const ReactMarkdown: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="reactMockDown">{children}</div>; // Simply render the children
};
 
export default ReactMarkdown;