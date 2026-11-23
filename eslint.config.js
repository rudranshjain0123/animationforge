export default [{
  ignores: ['dist/**'],
}, {
  files: ['**/*.js'],
  rules: { 'no-unused-vars': 'error', 'no-unreachable': 'error', 'no-dupe-keys': 'error' },
}]
