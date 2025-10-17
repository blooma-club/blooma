import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * Debug endpoint to check Supabase character table status
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Supabase environment variables are not configured',
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }, { status: 500 })
    }

    const supabase = getSupabaseClient()

    console.log('[Debug] Checking Supabase characters table...')

    // Test basic table access
    const { data, error, count } = await supabase
      .from('characters')
      .select('*', { count: 'exact' })
      .limit(5)

    const response = {
      success: true,
      tableExists: !error,
      characterCount: count,
      sampleCharacters: data,
      error: error?.message || null,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }

    console.log('[Debug] Characters table status:', response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Debug] Error checking characters table:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }, { status: 500 })
  }
}

/**
 * Debug endpoint to test character creation
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Supabase environment variables are not configured',
      }, { status: 500 })
    }

    const supabase = getSupabaseClient()

    const { user_id, project_id, name } = await request.json()

    if (!user_id || !name) {
      return NextResponse.json({ 
        error: 'Missing user_id or name for test character creation' 
      }, { status: 400 })
    }

    console.log('[Debug] Testing character creation:', { user_id, project_id, name })

    // Test with minimal data first to see what columns exist
    const testCharacter = {
      // Let Supabase generate the UUID
      user_id,
      project_id: project_id || null,
      name: `Test: ${name}`,
      description: 'Debug test character'
    }

    const { data, error } = await supabase
      .from('characters')
      .insert(testCharacter)
      .select()
      .single()

    if (error) {
      console.error('[Debug] Character creation failed:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        testData: testCharacter
      }, { status: 500 })
    }

    console.log('[Debug] Character creation successful:', data)

    return NextResponse.json({
      success: true,
      character: data,
      message: 'Test character created successfully'
    })

  } catch (error) {
    console.error('[Debug] Error in POST:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
