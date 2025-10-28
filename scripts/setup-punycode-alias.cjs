/**
 * Ensures every `require('punycode')` resolves to the userland module.
 * Node's bundled punycode implementation is deprecated and triggers
 * warnings in builds that depend on packages like `whatwg-url`.
 */
const fs = require('fs')
const path = require('path')
const Module = require('module')

// Next.js occasionally tries to write manifests before creating the dev static directory.
// Pre-creating the folder avoids transient ENOENT errors during startup.
try {
  const staticDevDir = path.join(process.cwd(), '.next', 'static', 'development')
  fs.mkdirSync(staticDevDir, { recursive: true })
} catch (error) {
  console.warn('[setup-punycode-alias] Failed to ensure .next/static/development:', error)
}

const originalResolveFilename = Module._resolveFilename

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request === 'punycode') {
    request = 'punycode/'
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}
