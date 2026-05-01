import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.from('participantes').select('*').limit(1)
  return NextResponse.json({ data })
}
