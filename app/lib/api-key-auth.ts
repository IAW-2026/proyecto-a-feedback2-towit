export function validateApiKey(request: Request): Response | null {
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey || apiKey !== process.env.INTERNAL_API_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
