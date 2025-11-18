'use server'

import { auth } from '@clerk/nextjs/server'
import { Polar } from '@polar-sh/sdk'
import { redirect } from 'next/navigation'
// import { useUser } from "@clerk/clerk-react";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: 'production',
})

// const { user } = useUser();

export const handleSubscription = async (planId: string) => {
  const { userId } = await auth()

  const PLAN_PRODUCT_ID_MAP: Record<string, string> = {
    'blooma-1000':
      process.env.POLAR_BLOOMA_1000_PRODUCT_ID ??
      (() => {
        throw new Error('POLAR_BLOOMA_3000_PRODUCT_ID is not defined')
      })(),
    'blooma-3000':
      process.env.POLAR_BLOOMA_3000_PRODUCT_ID ??
      (() => {
        throw new Error('POLAR_BLOOMA_3000_PRODUCT_ID is not defined')
      })(),
    'blooma-5000':
      process.env.POLAR_BLOOMA_5000_PRODUCT_ID ??
      (() => {
        throw new Error('POLAR_BLOOMA_5000_PRODUCT_ID is not defined')
      })(),
  }

  if (!userId) {
    throw new Error('Unable to start checkout without an authenticated user.')
  }

  const checkout = await polar.checkouts.create({
    products: [PLAN_PRODUCT_ID_MAP[planId]],
    successUrl: process.env.POLAR_SUCCESS_URL,
    externalCustomerId: userId,
  })

  redirect(checkout.url)
}
