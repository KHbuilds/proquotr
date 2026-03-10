import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ result: text })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Rewrite this service description to sound professional for a quote/invoice. Keep it concise (1 sentence max). Return ONLY the rewritten text, nothing else.\n\nOriginal: "${text}"`
        }]
      })
    })

    const data = await res.json()
    const result = data.content?.[0]?.text?.trim() || text
    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
