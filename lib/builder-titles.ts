// Builder titles for Hacker House Goa 2026 badges.

const BUILDER_TITLES = [
  'Full-Stack Hacker',
  'Software Builder',
  'Code Crafter',
  'Product Builder',
  'Tech Innovator',
  'Systems Hacker',
  'AI Builder',
  'App Builder',
  'Web Hacker',
  'Backend Builder',
  'Frontend Hacker',
  'Cloud Builder',
  'Data Hacker',
  'DevOps Builder',
  'Open Source Hacker',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateBuilderTitle(role?: string): string {
  return pick(BUILDER_TITLES)
}
