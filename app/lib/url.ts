export function isValidReturnUrl(url: string): boolean {
	if (url.startsWith('/')) return true
	try {
		const parsed = new URL(url)
		return (parsed.origin === process.env.RIDER_APP_URL) || (parsed.origin === process.env.DRIVER_APP_URL)
	} catch {
		return false
	}
}
