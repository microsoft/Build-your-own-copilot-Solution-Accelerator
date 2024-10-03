// __mocks__/jspdf.ts

// Import the jsPDF type from the actual jsPDF package

// import type { jsPDF as OriginalJsPDF } from 'jspdf';

// Mock implementation of jsPDF

const jsPDF = jest.fn().mockImplementation(() => ({

  text: jest.fn(),

  save: jest.fn(),

  addPage: jest.fn(),

  setFont: jest.fn(),

  setFontSize: jest.fn()

}))
// Export the mocked jsPDF with the correct type

export { jsPDF }
