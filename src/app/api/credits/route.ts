import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserCredits, getUserUsageStats, addCredits } from '@/lib/credits'

export async function GET(request: NextRequest) {
  try {
    // 사용자 인증
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'balance'
    const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'month'
    
    switch (action) {
      case 'balance': {
        // 크레딧 잔액 조회
        const credits = await getUserCredits(user.id)
        if (!credits) {
          return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          data: {
            credits: credits.credits,
            tier: credits.tier,
            user_id: user.id
          }
        })
      }
      
      case 'usage': {
        // 사용량 통계 조회
        const stats = await getUserUsageStats(user.id, period)
        if (!stats) {
          return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          data: {
            period,
            total_credits_used: stats.totalCreditsUsed,
            operation_counts: stats.operationCounts,
            provider_stats: stats.providerStats
          }
        })
      }
      
      case 'transactions': {
        // 거래 내역 조회
        const limit = parseInt(searchParams.get('limit') || '50', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        
        const { data: transactions, error } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (error) {
          return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          data: transactions,
          pagination: {
            limit,
            offset,
            count: transactions.length
          }
        })
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Credits API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 사용자 인증
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    const { action, amount, description } = body
    
    switch (action) {
      case 'add': {
        // 크레딧 추가 (관리자 또는 결제 시스템에서 사용)
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }
        
        const result = await addCredits(user.id, amount, description || '크레딧 추가')
        
        if (!result.success) {
          return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          data: {
            amount_added: amount,
            new_balance: result.newBalance,
            description: description || '크레딧 추가'
          }
        })
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Credits API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}