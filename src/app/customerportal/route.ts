import { Polar } from '@polar-sh/sdk'
import { NextResponse } from 'next/server'
import { resolvePolarServerURL } from '@/lib/server/polar-config'
import { getSupabaseUserAndSync } from '@/lib/supabase/server'

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
  const sessionUser = await getSupabaseUserAndSync()

  if (!sessionUser) {
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
    console.log('[customerportal] Creating session for userId:', sessionUser.id)
    console.log('[customerportal] Using customServerUrl:', customServerUrl ?? 'default')
    
    // Polar SDK ?몄텧 - customServerUrl???놁쑝硫???踰덉㎏ ?뚮씪誘명꽣 ?앸왂
    const sessionOptions = {
      externalCustomerId: sessionUser.id,
      returnUrl: `${appBaseUrl}/studio/create?billing=portal`,
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

    // Polar.sh Customer Portal濡?由щ떎?대젆??
    // 302 Found: ?쇰컲?곸씤 由щ떎?대젆??(釉뚮씪?곗?媛 GET ?붿껌?쇰줈 蹂寃?
    console.log('[customerportal] Redirecting to:', session.customerPortalUrl)
    return NextResponse.redirect(session.customerPortalUrl, { status: 302 })
  } catch (error: any) {
    console.error('[customerportal] Failed to create Polar customer session', {
      message: error?.message,
      statusCode: error?.statusCode,
      body: error?.body,
      name: error?.name,
    })
    
    // 怨좉컼??議댁옱?섏? ?딅뒗 寃쎌슦 - 怨좉컼??吏곸젒 ?앹꽦 ???ъ떆??
    const isCustomerNotFoundError =
      error?.statusCode === 422 ||
      error?.body?.includes('Customer does not exist') ||
      error?.message?.includes('Customer does not exist')

    if (isCustomerNotFoundError) {
      console.log('[customerportal] Customer not found, creating new customer')
      
      try {
        // Supabase?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
        const email = sessionUser.email
        const metadata = (sessionUser.user_metadata || {}) as Record<string, unknown>
        const name =
          (typeof metadata.full_name === 'string' && metadata.full_name) ||
          (typeof metadata.name === 'string' && metadata.name) ||
          undefined

        console.log('[customerportal] User info:', { email, name, userId: sessionUser.id })

        if (!email) {
          console.error('[customerportal] User email not found for customer creation')
          return NextResponse.json(
            { error: 'User email is required to create billing account.' },
            { status: 400 }
          )
        }

        // Polar.sh??怨좉컼 吏곸젒 ?앹꽦
        const createParams = {
          email,
          name: name ?? undefined,
          externalId: sessionUser.id,
        }
        
        const newCustomer = customServerUrl
          ? await polar.customers.create(createParams, { serverURL: customServerUrl })
          : await polar.customers.create(createParams)
        
        console.log('[customerportal] Customer created:', newCustomer.id)

        // 怨좉컼 ?앹꽦 ???ㅼ떆 ?몄뀡 ?앹꽦 ?쒕룄
        const sessionOptions = {
          externalCustomerId: sessionUser.id,
          returnUrl: `${appBaseUrl}/studio/create?billing=portal`,
        }
        
        const session = customServerUrl
          ? await polar.customerSessions.create(sessionOptions, { serverURL: customServerUrl })
          : await polar.customerSessions.create(sessionOptions)

        if (session.customerPortalUrl) {
          return NextResponse.redirect(session.customerPortalUrl, { status: 302 })
        }

        // 怨좉컼? ?앹꽦?섏뿀吏留??ы꽭 URL???녿뒗 寃쎌슦 ??쒕낫?쒕줈 由щ떎?대젆??
        console.log('[customerportal] No portal URL, redirecting to studio create')
        return NextResponse.redirect(`${appBaseUrl}/studio/create?billing=portal`)
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

