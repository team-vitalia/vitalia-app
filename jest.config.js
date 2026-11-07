module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testMatch: ["**/__tests__/**/*.(test|spec).(ts|tsx|js)"],
  moduleNameMapper: {
    "^react-native$": "react-native-web",
    "^@expo/vector-icons$": "<rootDir>/__mocks__/expo-vector-icons.js",
    "^expo-constants$": "<rootDir>/__mocks__/expo-constants.js",
    "^expo-linear-gradient$": "<rootDir>/__mocks__/expo-linear-gradient.js",
    "^react-native-svg$": "<rootDir>/__mocks__/react-native-svg.js",
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          types: ["jest"],
        },
      },
    ],
  },
};
