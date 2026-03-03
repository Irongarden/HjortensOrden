import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  // Parse optional keywords and selected event IDs from body
  let keywords: string[] = []
  let selectedEventIds: string[] = []
  let preferredDate = ''
  let location = ''
  try {
    const body = await req.json()
    keywords = Array.isArray(body.keywords) ? body.keywords : []
    selectedEventIds = Array.isArray(body.selectedEventIds) ? body.selectedEventIds : []
    preferredDate = typeof body.preferredDate === 'string' ? body.preferredDate : ''
    location = typeof body.location === 'string' ? body.location : ''
  } catch {
    // Body is optional
  }

  // Fetch events — prefer selected ones, fall back to recent 10
  let eventsQuery = supabase
    .from('events')
    .select('id, title, description, starts_at, location')
    .order('starts_at', { ascending: false })

  if (selectedEventIds.length > 0) {
    eventsQuery = (eventsQuery as typeof eventsQuery).in('id', selectedEventIds)
  } else {
    eventsQuery = (eventsQuery as typeof eventsQuery).limit(10)
  }

  const { data: events } = await eventsQuery

  const eventsText = events
    ?.map((e) => `- ${e.title} (${new Date(e.starts_at).toLocaleDateString('da-DK')})${e.location ? ` @ ${e.location}` : ''}`)
    .join('\n') ?? ''

  const keywordsText = keywords.length > 0
    ? `\nFokuser paa disse temaer/nogleord: ${keywords.join(', ')}.`
    : ''
  const dateText = preferredDate ? `\nOensket dato/periode: ${preferredDate}.` : ''
  const locationText = location ? `\nForetrukken lokation/omraade: ${location}.` : ''

  const randomSeed = Math.floor(Math.random() * 10000)
  const systemPrompt = `Du er kreativ raadgiver for "Hjortens Orden" — et eksklusivt herrebroderskab stiftet i 2010.
Ordenens aand er: broderskab, traditioner, natur, seriøsitet og diskret luksus.
Tidligere begivenheder:\n${eventsText || '(ingen endnu)'}\n${keywordsText}${dateText}${locationText}
Foreslaag 5 unikke og inspirerende begivenhedsideer passende for broderskabet. Seed: ${randomSeed}.
Sørg for at forslagene er friske og afviger fra tidligere ideer. Vaer kreativ og varieret.
Returner et JSON-array med objekter: { "title": string, "description": string, "type": string, "season": string, "estimatedBudget": number }
Svar KUN med det raa JSON-array, ingen markdown.`

  if (!process.env.OPENAI_API_KEY) {
    const pool = [
      { title: 'Vintersolhvervs Ceremoni', description: 'En hojtidelig samling ved lyset af fakler i skoven. Gammelt ritual genoplivet.', type: 'Tradition', season: 'Vinter', estimatedBudget: 2500 },
      { title: 'Stammens Whisky-akademi', description: 'En guided smagsrejse igennem 8 single malt whiskies med foredragsholder fra et skotsk destilleri.', type: 'Kulturel', season: 'Efteraar', estimatedBudget: 4800 },
      { title: 'Hjortens Storvildtsjagt', description: 'En todages jagt med overnatning i skovens hjerte. Professionel jaeger som guide.', type: 'Natur', season: 'Efteraar', estimatedBudget: 9500 },
      { title: 'Bibliotekets Hemmelige Selskab', description: 'Hvert medlem afleverer een bog med personlig dedikation og praesentation.', type: 'Intellektuel', season: 'Vinter', estimatedBudget: 800 },
      { title: 'Foraarsfesten i det Groenne', description: 'Ordenens store foraarsfest i en historisk herregaardshave. Champagne i rosenhaven.', type: 'Fest', season: 'Foraar', estimatedBudget: 12000 },
      { title: 'Cigar & Cognac Aften', description: 'En eksklusiv smagning af haandplukkede cigarer og cognacs i ordenens lokaler med ekspert.', type: 'Kulturel', season: 'Vinter', estimatedBudget: 3500 },
      { title: 'Flodkajak Ekspedition', description: 'Todages kajakeventyr langs en af Danmarks smukkeste åer med lejroplav og fællesspisning.', type: 'Natur', season: 'Sommer', estimatedBudget: 5500 },
      { title: 'Ordenens Debataften', description: 'Et struktureret debatformat om et aktuelt emne valgt af medlemmerne. Vinderen hedres.', type: 'Intellektuel', season: 'Foraar', estimatedBudget: 600 },
      { title: 'Midsommerbal i Herregaard', description: 'Ordenens store sommerbal med levende musik, dans og festmiddag i historiske omgivelser.', type: 'Fest', season: 'Sommer', estimatedBudget: 18000 },
      { title: 'Kokkekonkurrence', description: 'Hvert medlem tilbereder en ret. Blind smagning og hemmelig dommer kårer vinderen.', type: 'Kulturel', season: 'Forår', estimatedBudget: 2000 },
    ]
    // Shuffle and pick 5 unique suggestions each time
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 5)
    return NextResponse.json(shuffled)
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }], temperature: 0.85, max_tokens: 1200 }),
    })
    const json = await resp.json()
    const text: string = json.choices?.[0]?.message?.content ?? '[]'
    return NextResponse.json(JSON.parse(text))
  } catch (e: unknown) {
    console.error('OpenAI error:', e)
    return NextResponse.json({ error: 'Kunne ikke generere forslag' }, { status: 500 })
  }
}
