import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// 보호할 라우트 정의
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/project(.*)',
  '/storyboard(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  // 보호된 라우트에 접근할 때 인증 확인
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}