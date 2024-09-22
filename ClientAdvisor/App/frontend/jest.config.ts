import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/polyfills.js'],
  
  // Collect coverage
  collectCoverage: true,
  
  // Directory for coverage reports
  coverageDirectory: 'coverage',
  
  // Enforce coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}

export default config

