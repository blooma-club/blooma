/**
 * Ensures every `require('punycode')` resolves to the userland module.
 * Node's bundled punycode implementation is deprecated and triggers
 * warnings in builds that depend on packages like `whatwg-url`.
 */
const Module = require('module')
const originalResolveFilename = Module._resolveFilename

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request === 'punycode') {
    request = 'punycode/'
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}
