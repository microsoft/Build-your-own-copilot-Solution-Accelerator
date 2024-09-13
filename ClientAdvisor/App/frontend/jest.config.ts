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
    '\\.(css|less|scss|svg|png|jpg)$': 'identity-obj-proxy', // For mocking static file imports
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'], // For setting up testing environment like jest-dom
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest', // Transform TypeScript files using ts-jest
  },
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
}

export default config
