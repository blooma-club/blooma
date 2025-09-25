'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Coins, Crown, Zap } from 'lucide-react'

interface UserCredits {
  credits: number
  credits_used: number
  subscription_tier: 'basic' | 'pro' | 'enterprise'
}

export default function CreditStatus() {
  const { user } = useSupabase()
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const lastFetchedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      // 동일 사용자에 대해 최초 1회만 자동 로드 (개발 모드 StrictMode 이중 실행 방지)
      if (lastFetchedUserIdRef.current === user.id) return
      lastFetchedUserIdRef.current = user.id

      try {
        const response = await fetch(`/api/credits?user_id=${user.id}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setCredits(result.data)
          }
        }
      } catch (error) {
        console.error('Error fetching credits:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()
  }, [user?.id])

  if (!user || loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700">
        <div className="w-4 h-4 bg-neutral-600 rounded-full animate-pulse" />
        <span className="text-sm text-neutral-400">Loading...</span>
      </div>
    )
  }

  // 기본값 설정 (크레딧 API가 없을 경우)
  const defaultCredits = {
    credits: 100,
    credits_used: 0,
    subscription_tier: 'basic' as const,
  }

  const creditData = credits || defaultCredits

  // 구독 티어별 아이콘과 색상
  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'pro':
        return {
          icon: Crown,
          color: 'text-amber-400',
          bgColor: 'bg-amber-400/10',
          borderColor: 'border-amber-400/30',
          label: 'Pro',
        }
      case 'enterprise':
        return {
          icon: Zap,
          color: 'text-purple-400',
          bgColor: 'bg-purple-400/10',
          borderColor: 'border-purple-400/30',
          label: 'Enterprise',
        }
      default: // 'basic'
        return {
          icon: Coins,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          borderColor: 'border-blue-400/30',
          label: 'Basic',
        }
    }
  }

  const tierInfo = getTierInfo(creditData.subscription_tier)
  const TierIcon = tierInfo.icon

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg ${tierInfo.bgColor} border ${tierInfo.borderColor}`}
    >
      {/* 구독 티어 */}
      <div className="flex items-center gap-1.5">
        <TierIcon className={`w-4 h-4 ${tierInfo.color}`} />
        <span className={`text-xs font-medium ${tierInfo.color}`}>{tierInfo.label}</span>
      </div>

      {/* 구분선 */}
      <div className="w-px h-4 bg-neutral-600" />

      {/* 크레딧 잔액 */}
      <div className="flex items-center gap-1.5">
        <Coins className="w-4 h-4 text-neutral-300" />
        <span className="text-sm font-medium text-white">
          {creditData.credits.toLocaleString()}
        </span>
        <span className="text-xs text-neutral-400">credits</span>
      </div>
    </div>
  )
}
