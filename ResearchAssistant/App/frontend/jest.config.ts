import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: "jest-environment-jsdom",
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg)$': '<rootDir>/__mocks__/fileMock.js',
    '^lodash-es$': 'lodash',
  },
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  transform: {
            
    '^.+\\.jsx?$': 'babel-jest',       // Transform JavaScript files using babel-jest
    '^.+\\.tsx?$': 'ts-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-markdown|remark-gfm|rehype-raw)/)',
  ],
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/', // Ignore node_modules
    '<rootDir>/__mocks__/', // Ignore mocks
    '<rootDir>/src/api/',
    '<rootDir>/src/mocks/',
    '<rootDir>/src/test/',
    '<rootDir>/src/index.tsx',
    '<rootDir>/src/vite-env.d.ts',
    '<rootDir>/src/components/QuestionInput/index.ts',
    '<rootDir>/src/components/Answer/index.ts',
    '<rootDir>/src/state'
  ],
};

export default config;
