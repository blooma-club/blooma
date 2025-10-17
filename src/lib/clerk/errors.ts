export class ClerkAuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'ClerkAuthenticationError'
  }
}

export class ClerkProfileResolutionError extends Error {
  constructor(message: string = 'Unable to resolve Clerk user profile') {
    super(message)
    this.name = 'ClerkProfileResolutionError'
  }
}
