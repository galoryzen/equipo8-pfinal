module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|i18next|react-i18next)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/app/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^@ui/(.*)$": "<rootDir>/src/shared/ui/$1",
    "^@theme/(.*)$": "<rootDir>/src/theme/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
  },
  coverageReporters: ["json", "json-summary", "lcov", "text", "html"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  collectCoverageFrom: [
    "src/features/**/*.{ts,tsx}",
    "src/services/api.ts",
    "src/services/auth-context.tsx",
    "src/shared/**/*.{ts,tsx}",
    "!src/**/i18n/**",
    "!src/**/index.ts",
    "!src/types/**",
    "!src/theme/**",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
};
