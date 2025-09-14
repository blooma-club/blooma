'use client'

import React, { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Coins, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreditInfo {
  credits: number
  tier: string
  user_id: string
}

interface UsageStats {
  period: string
  total_credits_used: number
  operation_counts: Record<string, number>
  provider_stats: Record<string, number>
}

export const CreditDisplay: React.FC = () => {
  const { user, session } = useSupabase()
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCreditInfo = async () => {
    if (!session?.access_token || !user) return
    
    try {
      setLoading(true)
      setError(null)
      
      // 크레딧 잔액 조회
      const balanceResponse = await fetch('/api/credits?action=balance', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!balanceResponse.ok) {
        throw new Error('Failed to fetch credit balance')
      }
      
      const balanceData = await balanceResponse.json()
      setCreditInfo(balanceData.data)
      
      // 이번 달 사용량 조회
      const usageResponse = await fetch('/api/credits?action=usage&period=month', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json()
        setUsageStats(usageData.data)
      }
      
    } catch (error) {
      console.error('Error fetching credit info:', error)
      setError(error instanceof Error ? error.message : 'Failed to load credit information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCreditInfo()
  }, [session, user])

  if (!user || loading) {
    return (
      <div className="flex items-center gap-2 text-neutral-400">
        <div className="w-4 h-4 border border-neutral-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading credits...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Error loading credits</span>
      </div>
    )
  }

  if (!creditInfo) {
    return null
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'text-blue-400'
      case 'enterprise': return 'text-purple-400'
      default: return 'text-green-400'
    }
  }

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'pro': return 'Pro'
      case 'enterprise': return 'Enterprise'
      default: return 'Free'
    }
  }

  const isLowCredits = creditInfo.credits < 10

  return (
    <div className="flex items-center gap-3">
      {/* 크레딧 잔액 */}
      <div className="flex items-center gap-1.5">
        <Coins className={`w-4 h-4 ${isLowCredits ? 'text-red-400' : 'text-yellow-400'}`} />
        <span className={`text-sm font-medium ${isLowCredits ? 'text-red-400' : 'text-white'}`}>
          {creditInfo.credits.toLocaleString()}
        </span>
      </div>

      {/* 구독 티어 */}
      <div className="flex items-center gap-1">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${getTierColor(creditInfo.tier)} border-current bg-current/10`}>
          {getTierName(creditInfo.tier)}
        </span>
      </div>

      {/* 이번 달 사용량 (있는 경우) */}
      {usageStats && (
        <div className="flex items-center gap-1 text-neutral-400">
          <TrendingUp className="w-3 h-3" />
          <span className="text-xs">
            {usageStats.total_credits_used} used
          </span>
        </div>
      )}

      {/* 크레딧 부족 경고 */}
      {isLowCredits && (
        <Button 
          size="sm" 
          variant="outline" 
          className="text-xs px-2 py-1 border-red-600 text-red-400 hover:bg-red-600/10"
          onClick={() => {
            // TODO: 크레딧 구매 페이지로 이동
            console.log('Open credit purchase modal')
          }}
        >
          Add Credits
        </Button>
      )}
    </div>
  )
}

export default CreditDisplay