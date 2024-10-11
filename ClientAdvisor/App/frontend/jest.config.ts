import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
   verbose: true,
  // transform: {
  //   '^.+\\.tsx?$': 'ts-jest'
  // },
  // setupFilesAfterEnv: ['<rootDir>/polyfills.js']

  preset: 'ts-jest',
  //testEnvironment: 'jsdom',  // For React DOM testing
  testEnvironment: "jest-environment-jsdom",
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy', // For mocking static file imports
    //'^react-markdown$': '<rootDir>/__mocks__/react-markdown.js',
    //'react-markdown': '<rootDir>/node_modules/react-markdown/react-markdown.min.js' // For mocking static file imports
    //'^react-syntax-highlighter$': '<rootDir>/__mocks__/react-syntax-highlighter.js',
   // '^react-syntax-highlighter$': '<rootDir>/__mocks__/react-syntax-highlighter.js',
   //'react-markdown': '<rootDir>/node_modules/react-markdown/react-markdown.min.js',
   '^react-markdown$': '<rootDir>/__mocks__/react-markdown.tsx', 
   '^dompurify$': '<rootDir>/__mocks__/dompurify.js', // Point to the mock
   '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'], // For setting up testing environment like jest-dom
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest' // Transform TypeScript files using ts-jest
    //'^.+\\.ts(x)?$': 'ts-jest',  // For TypeScript files
    //'^.+\\.js$': 'babel-jest',  // For JavaScript files if you have Babel

    // "^.+\\.tsx?$": "babel-jest", // Use babel-jest for TypeScript
    // "^.+\\.jsx?$": "babel-jest", // Use babel-jest for JavaScript/JSX

    //'^.+\\.[jt]sx?$': 'babel-jest',

  },

  // transformIgnorePatterns: [
  //   "/node_modules/(?!(react-syntax-highlighter|react-markdown)/)"
  // ],

  // transformIgnorePatterns: [
  //   'node_modules/(?!react-markdown/)'
  // ],

  // transformIgnorePatterns: [
  //   '/node_modules/(?!react-markdown|vfile|unist-util-stringify-position|unist-util-visit|bail|is-plain-obj|react-syntax-highlighter|)',
  // ],

  // transformIgnorePatterns: [
  //   "/node_modules/(?!react-syntax-highlighter/)", // Transform react-syntax-highlighter module
  // ],

  //testPathIgnorePatterns: ['./node_modules/'],
 // moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  //globals: { fetch },
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  // globals: {
  //   'ts-jest': {
  //     isolatedModules: true, // Prevent isolated module errors
  //   },
  // }
  // globals: {
  //     IS_REACT_ACT_ENVIRONMENT: true,
  //   }

  // collectCoverage: true,
  // //collectCoverageFrom: ['src/**/*.{ts,tsx}'],  // Adjust the path as needed
  // //coverageReporters: ['json', 'lcov', 'text', 'clover'],
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80,
  //   },
  // },

  // coveragePathIgnorePatterns: [
  //   '<rootDir>/node_modules/', // Ignore node_modules
  //   '<rootDir>/__mocks__/', // Ignore mocks
  //   '<rootDir>/src/state/',
  //   '<rootDir>/src/api/', 
  //   '<rootDir>/src/mocks/', 
  //   '<rootDir>/src/test/', 
  // ],

  
}

export default config
