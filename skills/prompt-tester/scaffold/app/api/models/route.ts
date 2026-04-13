import { NextResponse } from 'next/server'
import { MODELS } from '@/app/lib/models'

export async function GET() {
  return NextResponse.json(MODELS)
}
