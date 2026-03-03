import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = cookies()
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const supabase = createAdminClient()

  let body: {
    proposalId: string
    actionType: 'theme-ideas' | 'program-timeline' | 'budget-breakdown' | 'activities'
    context: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { proposalId, actionType, context } = body
  if (!proposalId || !actionType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verify access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: proposal } = await (supabase as any)
    .from('arrangement_proposals')
    .select('id, title, type, season, created_by, collaborator_ids')
    .eq('id', proposalId)
    .single()
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = proposal as any
  const hasAccess = p.created_by === user.id ||
    (p.collaborator_ids as string[]).includes(user.id)
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Build prompt based on action type
  const promptSeed = {
    type: p.type ?? context.type ?? '',
    season: p.season ?? context.season ?? '',
    title: p.title,
    ...context,
  }

  let systemPrompt = ''
  const seed = Math.floor(Math.random() * 9999)

  if (actionType === 'theme-ideas') {
    systemPrompt = `Du er kreativ arrangementskonsulent for "Hjortens Orden" — et eksklusivt herrebroderskab.
Stil: broderskab, traditioner, natur, diskret luksus.
Arrangement: "${promptSeed.title}", type: ${promptSeed.type || 'ukendt'}, sæson: ${promptSeed.season || 'ukendt'}.
Seed: ${seed}.
Generér 5 tematiske idéer/koncepter for dette arrangement.
Returner JSON: [{ "theme": string, "concept": string, "moodWords": string[], "suggestedActivities": string[] }]
Svar KUN med råt JSON.`
  } else if (actionType === 'program-timeline') {
    systemPrompt = `Du er arrangementplanlægger for "Hjortens Orden".
Arrangement: "${promptSeed.title}", type: ${promptSeed.type || 'social'}, sæson: ${promptSeed.season || ''}.
Varighed: ${context.duration ?? '4 timer'}.
Seed: ${seed}.
Lav et detaljeret tidsplanforslag.
Returner JSON: [{ "time": string, "title": string, "description": string, "durationMinutes": number }]
Svar KUN med råt JSON.`
  } else if (actionType === 'budget-breakdown') {
    const totalBudget = context.totalBudget ?? 5000
    const participants = context.participants ?? 10
    systemPrompt = `Du er økonomiansvarlig for "Hjortens Orden".
Arrangement: "${promptSeed.title}", type: ${promptSeed.type || ''}, sæson: ${promptSeed.season || ''}.
Samlet budget: ${totalBudget} DKK, deltagere: ${participants}.
Seed: ${seed}.
Foreslå en detaljeret budgetfordeling.
Returner JSON: { "incomeLines": [{ "label": string, "amount": number }], "expenseLines": [{ "category": string, "label": string, "amount": number, "notes": string }] }
Svar KUN med råt JSON.`
  } else if (actionType === 'activities') {
    systemPrompt = `Du er aktivitetskonsulent for "Hjortens Orden" — eksklusivt herrebroderskab.
Arrangement: "${promptSeed.title}", type: ${promptSeed.type || ''}, sæson: ${promptSeed.season || ''}.
Omtrentlig lokation: ${context.location ?? 'Danmark'}.
Seed: ${seed}.
Foreslå 6 konkrete aktiviteter der passer til arrangementet.
Returner JSON: [{ "title": string, "description": string, "duration": string, "indoorOutdoor": "indoor"|"outdoor"|"both", "estimatedCostPerPerson": number }]
Svar KUN med råt JSON.`
  }

  let result: Record<string, unknown>

  if (!process.env.OPENAI_API_KEY) {
    // Fallback mock responses
    const mocks: Record<typeof actionType, unknown> = {
      'theme-ideas': [
        { theme: 'Det Mørke Bibliotek', concept: 'En mystisk aften med bøger, candlelight og fortællekunst', moodWords: ['eksklusiv', 'intellektuel', 'intim'], suggestedActivities: ['Blindsmagning af vine', 'Fortællekonkurrence'] },
        { theme: 'Skovens Orden', concept: 'Naturoplevelse med ritualer og fællesspisning under åben himmel', moodWords: ['naturlig', 'rå', 'broderskab'], suggestedActivities: ['Fakkeloptog', 'Friluftsmiddag'] },
      ],
      'program-timeline': [
        { time: '16:00', title: 'Ankomst & Velkomstdrink', description: 'Champagne og let snack i forhaven', durationMinutes: 30 },
        { time: '16:30', title: 'Rundvisning', description: 'Guided tour af lokationens historiske rum', durationMinutes: 45 },
        { time: '17:15', title: 'Foredrag', description: 'Aftentaler om årets tema', durationMinutes: 45 },
        { time: '18:00', title: 'Forret & Apéritif', description: '', durationMinutes: 30 },
        { time: '18:30', title: 'Hoveret', description: 'Tre-retters middag med tilhørende vine', durationMinutes: 90 },
        { time: '20:00', title: 'Festlig aktivitet', description: 'Tema-specifik aktivitet for gruppen', durationMinutes: 60 },
        { time: '21:00', title: 'Dessert & Cognac', description: 'Afslutning med cigar og cognac', durationMinutes: 60 },
      ],
      'budget-breakdown': {
        incomeLines: [{ label: 'Deltagerbetaling', amount: 2000 }],
        expenseLines: [
          { category: 'Lokation', label: 'Lejeomkostning', amount: 3000, notes: 'Inkl. rengøring' },
          { category: 'Mad & Drikke', label: 'Forret + Hoveret + Dessert', amount: 4500, notes: '10 personer' },
          { category: 'Mad & Drikke', label: 'Vine + Champagne + Cognac', amount: 2000, notes: '' },
          { category: 'Musik / Underholdning', label: 'Foredragsholder', amount: 1500, notes: '' },
          { category: 'Ritual / Dekoration', label: 'Blomster og dekor', amount: 800, notes: '' },
          { category: 'Diverse', label: 'Uforudsete udgifter', amount: 500, notes: '5% buffer' },
        ],
      },
      'activities': [
        { title: 'Blindsmagning af Whisky', description: '6 single malts — gæt destilleriet', duration: '60 min', indoorOutdoor: 'indoor', estimatedCostPerPerson: 250 },
        { title: 'Fakkeloptog i Skoven', description: 'Guidet vandring ved fakkellys', duration: '45 min', indoorOutdoor: 'outdoor', estimatedCostPerPerson: 50 },
        { title: 'Cigarklub', description: 'Guided smagning med ekspert', duration: '90 min', indoorOutdoor: 'both', estimatedCostPerPerson: 300 },
      ],
    }
    result = { suggestions: mocks[actionType] }
  } else {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }], temperature: 0.8, max_tokens: 1500 }),
      })
      const json = await resp.json()
      const text: string = json.choices?.[0]?.message?.content ?? '{}'
      result = { suggestions: JSON.parse(text) }
    } catch (e) {
      console.error('OpenAI error:', e)
      return NextResponse.json({ error: 'AI kald fejlede' }, { status: 500 })
    }
  }

  // Store suggestion in DB for traceability (no PII in prompt_seed)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('proposal_ai_suggestions').insert({
      proposal_id: proposalId,
      action_type: actionType,
      prompt_seed: { type: promptSeed.type, season: promptSeed.season, actionType },
      response: result,
      created_by: user.id,
    })
  } catch (e) {
    console.error('Failed to store AI suggestion:', e)
    // Non-fatal
  }

  return NextResponse.json(result)
}
