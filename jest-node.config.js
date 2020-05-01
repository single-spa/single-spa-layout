module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[t|j]sx?$": "babel-jest",
  },
  // constructLayout will eventually work in NodeJS for SSR, but doesn't yet
  testPathIgnorePatterns: ["/node_modules/", "test/constructLayout.test.js"],
};
