export function isValidReturnUrl(url: string): boolean {
	if (url.startsWith('/')) return true
	try {
		const parsed = new URL(url)
		return parsed.origin === process.env.RIDER_APP_HOME_URL
	} catch {
		return false
	}
}
