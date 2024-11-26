const DOMPurify = {
  sanitize: jest.fn((input: string) => input), // Mock implementation that returns the input
};

export default DOMPurify; // Use default export
