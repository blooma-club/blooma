// Punycode alias setup for Node.js 21+ compatibility
// Node.js 21+ removed punycode from built-in modules
// This ensures punycode can be resolved when needed by dependencies

try {
  // Try to require punycode from node_modules
  const punycodePath = require.resolve('punycode/')
  // Set up module alias if needed
  if (!require.cache[punycodePath]) {
    require(punycodePath)
  }
} catch (error) {
  // If punycode is not found, it will be resolved via webpack alias in next.config.ts
  // This is a no-op for runtime, webpack will handle it during build
}

