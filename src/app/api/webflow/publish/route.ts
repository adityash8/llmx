import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Direct Webflow root llms.txt publication is unavailable. Download the file and install it at your site root.' }, { status: 501 })
}
