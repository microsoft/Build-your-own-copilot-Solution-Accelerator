// __mocks__/react-markdown.tsx

import React from 'react';

// Mock implementation of react-markdown
const mockNode = {
  children: [{ value: 'console.log("Test Code");' }]
};
const mockProps = { className: 'language-javascript' };

const ReactMarkdown: React.FC<{ children: React.ReactNode , components: any }> = ({ children,components }) => {
  if(!components.code){
    components.code = ({ ...codeProps }) => {
      return <div>Test Code text from markdown </div>
    }
  }
  return <div data-testid="reactMockDown">
    {components && components.code({ node: mockNode, ...mockProps })}
    {children}</div>; // Simply render the children
};

export default ReactMarkdown;
