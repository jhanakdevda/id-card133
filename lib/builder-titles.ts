// Fun "builder title" generator for Hacker House Goa 2026 badges.

const PREFIXES = [
  'Full-Stack',
  'Midnight',
  'Serverless',
  'Caffeine-Driven',
  'Chaos',
  'Zero-Bug',
  'Prompt',
  'Ship-Fast',
  'Late-Night',
  'Recursive',
  'Async',
  'Beachside',
  'Terminal',
  'Neon',
  'Sunset',
]

const NOUNS = [
  'Sorcerer',
  'Shipper',
  'Whisperer',
  'Alchemist',
  'Wrangler',
  'Architect',
  'Overlord',
  'Nomad',
  'Maverick',
  'Hacker',
  'Tinkerer',
  'Wizard',
  'Pathfinder',
  'Renegade',
  'Virtuoso',
]

// Map a few common stacks/roles to a themed noun for a little relevance.
const ROLE_HINTS: { match: RegExp; noun: string }[] = [
  { match: /front|react|ui|design|css/i, noun: 'Pixel Pusher' },
  { match: /back|api|server|node|go|rust|python/i, noun: 'Backend Sorcerer' },
  { match: /ai|ml|llm|data|prompt/i, noun: 'Prompt Alchemist' },
  { match: /devops|infra|cloud|platform|sre/i, noun: 'Infra Whisperer' },
  { match: /mobile|ios|android|swift|flutter/i, noun: 'Pocket Wizard' },
  { match: /founder|ceo|product|pm/i, noun: 'Chief Shipper' },
  { match: /design|figma|ux/i, noun: 'Vibe Architect' },
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateBuilderTitle(role?: string): string {
  const trimmed = role?.trim()
  if (trimmed) {
    const hint = ROLE_HINTS.find((h) => h.match.test(trimmed))
    // 60% chance to use the role-relevant title when we have a match
    if (hint && Math.random() < 0.6) return hint.noun
  }
  return `${pick(PREFIXES)} ${pick(NOUNS)}`
}
