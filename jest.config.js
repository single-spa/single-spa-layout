export default {
  transform: {
    '^.+\\.[t|j]sx?$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.js'],
  snapshotSerializers: ['jest-serializer-html'],
};
