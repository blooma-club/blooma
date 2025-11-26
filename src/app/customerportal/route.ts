import { auth, currentUser } from '@clerk/nextjs/server'
import { Polar } from '@polar-sh/sdk'
import { NextResponse } from 'next/server'
import { resolvePolarServerURL } from '@/lib/server/polar-config'

const polarServer =
  process.env.POLAR_SERVER?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production'

function resolveAppBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  return base.replace(/\/+$/, '')
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN ?? process.env.POLAR_API_KEY
  if (!accessToken) {
    return NextResponse.json({ error: 'Billing provider is not configured.' }, { status: 500 })
  }

  const polar = new Polar({
    accessToken,
    server: polarServer,
  })

  const customServerUrl = resolvePolarServerURL()
  const appBaseUrl = resolveAppBaseUrl()

  try {
    console.log('[customerportal] Creating session for userId:', userId)
    console.log('[customerportal] Using customServerUrl:', customServerUrl ?? 'default')
    
    // Polar SDK 호출 - customServerUrl이 없으면 두 번째 파라미터 생략
    const sessionOptions = {
      externalCustomerId: userId,
      returnUrl: `${appBaseUrl}/dashboard`,
    }
    
    const session = customServerUrl
      ? await polar.customerSessions.create(sessionOptions, { serverURL: customServerUrl })
      : await polar.customerSessions.create(sessionOptions)

    console.log('[customerportal] Session created:', {
      hasPortalUrl: !!session.customerPortalUrl,
      portalUrl: session.customerPortalUrl,
    })

    if (!session.customerPortalUrl) {
      throw new Error('Missing customer portal URL in Polar response.')
    }

    // Polar.sh Customer Portal로 리다이렉트
    // 302 Found: 일반적인 리다이렉트 (브라우저가 GET 요청으로 변경)
    console.log('[customerportal] Redirecting to:', session.customerPortalUrl)
    return NextResponse.redirect(session.customerPortalUrl, { status: 302 })
  } catch (error: any) {
    console.error('[customerportal] Failed to create Polar customer session', {
      message: error?.message,
      statusCode: error?.statusCode,
      body: error?.body,
      name: error?.name,
    })
    
    // 고객이 존재하지 않는 경우 - 고객을 직접 생성 후 재시도
    const isCustomerNotFoundError =
      error?.statusCode === 422 ||
      error?.body?.includes('Customer does not exist') ||
      error?.message?.includes('Customer does not exist')

    if (isCustomerNotFoundError) {
      console.log('[customerportal] Customer not found, creating new customer')
      
      try {
        // Clerk에서 사용자 정보 가져오기
        const user = await currentUser()
        const email = user?.emailAddresses?.[0]?.emailAddress
        const name = user?.fullName || user?.firstName || undefined

        console.log('[customerportal] User info:', { email, name, userId })

        if (!email) {
          console.error('[customerportal] User email not found for customer creation')
          return NextResponse.json(
            { error: 'User email is required to create billing account.' },
            { status: 400 }
          )
        }

        // Polar.sh에 고객 직접 생성
        const createParams = {
          email,
          name: name ?? undefined,
          externalId: userId,
        }
        
        const newCustomer = customServerUrl
          ? await polar.customers.create(createParams, { serverURL: customServerUrl })
          : await polar.customers.create(createParams)
        
        console.log('[customerportal] Customer created:', newCustomer.id)

        // 고객 생성 후 다시 세션 생성 시도
        const sessionOptions = {
          externalCustomerId: userId,
          returnUrl: `${appBaseUrl}/dashboard`,
        }
        
        const session = customServerUrl
          ? await polar.customerSessions.create(sessionOptions, { serverURL: customServerUrl })
          : await polar.customerSessions.create(sessionOptions)

        if (session.customerPortalUrl) {
          return NextResponse.redirect(session.customerPortalUrl, { status: 302 })
        }

        // 고객은 생성되었지만 포털 URL이 없는 경우 대시보드로 리다이렉트
        console.log('[customerportal] No portal URL, redirecting to dashboard')
        return NextResponse.redirect(`${appBaseUrl}/dashboard`)
      } catch (createError: any) {
        console.error('[customerportal] Failed to create Polar customer', {
          message: createError?.message,
          statusCode: createError?.statusCode,
          body: createError?.body,
        })
        return NextResponse.json(
          { error: 'Unable to initialize billing account.' },
          { status: 502 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Unable to open billing portal.' },
      { status: 502 }
    )
  }
}
