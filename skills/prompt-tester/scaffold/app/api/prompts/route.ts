import { NextRequest, NextResponse } from 'next/server'
import { createPrompt, listPrompts } from '@/app/lib/storage'

export async function GET() {
  const prompts = await listPrompts()
  return NextResponse.json(prompts)
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  const prompt = await createPrompt(name ?? 'Untitled prompt')
  return NextResponse.json(prompt, { status: 201 })
}
