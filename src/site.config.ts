import type { SiteConfig } from '@/types'
import type { AstroExpressiveCodeOptions } from 'astro-expressive-code'

export const siteConfig: SiteConfig = {
	author: 'Markus Becerra',
	title: 'Markus Becerra',
	description: 'Engineering, music, and recreation — notes from the workshop.',
	lang: 'en-US',
	ogLocale: 'en_US',
	date: {
		locale: 'en-US',
		options: {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			// Frontmatter dates are parsed as UTC midnight; format them in UTC too, or
			// every post shows up a day early for anyone west of Greenwich.
			timeZone: 'UTC'
		}
	}
}

export const menuLinks: Array<{ title: string; path: string }> = [
	{ title: 'Home', path: '/' },
	{ title: 'About', path: '/about/' },
	{ title: 'Work', path: '/work/' },
	{ title: 'Projects', path: '/projects/' },
	{ title: 'Blog', path: '/blog/' }
]

// https://expressive-code.com/reference/configuration/
export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
	// One dark, one light theme => https://expressive-code.com/guides/themes/#available-themes
	themes: ['dracula', 'github-light'],
	themeCssSelector(theme, { styleVariants }) {
		// If one dark and one light theme are available
		// generate theme CSS selectors compatible with cactus-theme dark mode switch
		if (styleVariants.length >= 2) {
			const baseTheme = styleVariants[0]?.theme
			const altTheme = styleVariants.find((v) => v.theme.type !== baseTheme?.type)?.theme
			if (theme === baseTheme || theme === altTheme) return `[data-theme='${theme.type}']`
		}
		// return default selector
		return `[data-theme="${theme.name}"]`
	},
	useThemedScrollbars: false,
	// Wrap long lines instead of clipping them at the frame edge; indentation is kept.
	defaultProps: {
		wrap: true
	},
	// Keep each theme's syntax colours but sit them on the site's own warm surfaces,
	// so neither a white slab (light) nor a violet one (dark) lands on the paper.
	styleOverrides: {
		codeBackground: 'hsl(var(--code))',
		borderColor: 'hsl(var(--border))',
		borderWidth: '1px',
		frames: {
			frameBoxShadowCssValue: 'none',
			editorBackground: 'hsl(var(--code))',
			editorTabBarBackground: 'hsl(var(--code))',
			editorActiveTabBackground: 'hsl(var(--code))',
			editorTabBarBorderBottomColor: 'hsl(var(--border))',
			terminalBackground: 'hsl(var(--code))',
			terminalTitlebarBackground: 'hsl(var(--code))',
			terminalTitlebarBorderBottomColor: 'hsl(var(--border))'
		},
		uiLineHeight: 'inherit',
		codeFontSize: '0.875rem',
		codeLineHeight: '1.7142857rem',
		borderRadius: '0.375rem',
		codePaddingInline: '1rem',
		codeFontFamily:
			'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;'
	}
}
