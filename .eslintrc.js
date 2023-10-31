module.exports = {
  extends: ['eslint-config-ali/typescript', 'prettier', 'prettier/@typescript-eslint'],
  rules: {
    'no-console': 'off',
    'no-require-imports': 'off',
    '@typescript-eslint/explicit-member-accessibility': 0,
  },
};
