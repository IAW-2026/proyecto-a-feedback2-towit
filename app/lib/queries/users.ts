import { clerkClient } from '@clerk/nextjs/server'

// Resuelve un conjunto de clerk_id a un nombre legible usando una sola
// llamada batch a Clerk. Devuelve un map con id -> nombre (o id como
// fallback si el usuario no existe o no se puede obtener).
export async function resolveDisplayNames(
  ids: string[],
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Boolean(id))))

  if (uniqueIds.length === 0) {
    return {}
  }

  const client = await clerkClient()
  const response = await client.users
    .getUserList({ userId: uniqueIds, limit: 100 })
    .catch(() => null)
  const users = response?.data ?? []

  const map: Record<string, string> = {}

  for (const user of users) {
    const displayName =
      user.fullName ??
      user.username ??
      [user.firstName, user.lastName].filter(Boolean).join(' ') ??
      user.id

    map[user.id] = displayName
  }

  for (const id of uniqueIds) {
    if (!map[id]) {
      map[id] = id
    }
  }

  return map
}
