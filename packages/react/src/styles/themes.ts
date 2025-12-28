/**
 * ChatSDK Theme System
 *
 * This file provides theme configurations for ChatSDK React components.
 * Themes allow you to customize colors, fonts, spacing, and other design tokens
 * to match your application's design system.
 */

export interface ChatSDKTheme {
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  fonts: {
    body: string;
    heading: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

/**
 * Default ChatSDK Theme
 * Clean, modern design with neutral colors
 */
export const defaultTheme: ChatSDKTheme = {
  colors: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    secondary: '#6b7280',
    secondaryHover: '#4b5563',
    background: '#ffffff',
    surface: '#f9fafb',
    surfaceHover: '#f3f4f6',
    border: '#e5e7eb',
    text: '#111827',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
};

/**
 * Impact Idol Theme
 *
 * Vibrant, energetic theme matching Impact Idol's brand identity.
 * This theme emphasizes community, achievement, and positive impact.
 *
 * Brand Guidelines:
 * - Primary: Bold purple (#8b5cf6) - Represents creativity and inspiration
 * - Secondary: Vibrant orange (#f97316) - Represents energy and achievement
 * - Accent: Fresh green (#10b981) - Represents growth and positive impact
 *
 * @example
 * ```tsx
 * import { ChatProvider } from '@chatsdk/react';
 * import { impactIdolTheme } from '@chatsdk/react/styles/themes';
 *
 * function App() {
 *   return (
 *     <ChatProvider client={client} theme={impactIdolTheme}>
 *       <ChannelList />
 *       <MessageList />
 *     </ChatProvider>
 *   );
 * }
 * ```
 */
export const impactIdolTheme: ChatSDKTheme = {
  colors: {
    // Purple primary - creativity and inspiration
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',

    // Orange secondary - energy and achievement
    secondary: '#f97316',
    secondaryHover: '#ea580c',

    // Light, clean backgrounds
    background: '#ffffff',
    surface: '#fafaf9',
    surfaceHover: '#f5f5f4',

    // Subtle borders
    border: '#e7e5e4',

    // Text colors with good contrast
    text: '#1c1917',
    textSecondary: '#57534e',
    textMuted: '#a8a29e',

    // Status colors
    success: '#10b981', // Green - growth and positive impact
    error: '#ef4444',   // Red - errors
    warning: '#f59e0b', // Amber - warnings
    info: '#06b6d4',    // Cyan - information
  },

  // Rounded corners for friendly, approachable feel
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },

  // Generous spacing for breathing room
  spacing: {
    xs: '0.375rem',
    sm: '0.625rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2.5rem',
  },

  // Modern, clean fonts
  fonts: {
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace',
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },

  // Subtle shadows for depth
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
};

/**
 * Dark Mode Theme
 * For applications that support dark mode
 */
export const darkTheme: ChatSDKTheme = {
  colors: {
    primary: '#60a5fa',
    primaryHover: '#3b82f6',
    secondary: '#9ca3af',
    secondaryHover: '#6b7280',
    background: '#111827',
    surface: '#1f2937',
    surfaceHover: '#374151',
    border: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    success: '#34d399',
    error: '#f87171',
    warning: '#fbbf24',
    info: '#60a5fa',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
  },
};

/**
 * Create a custom theme by extending the default theme
 *
 * @param customTheme - Partial theme object to override defaults
 * @returns Complete theme with your customizations
 *
 * @example
 * ```typescript
 * const myTheme = createTheme({
 *   colors: {
 *     primary: '#ff6b6b',
 *     secondary: '#4ecdc4',
 *   },
 *   fonts: {
 *     body: 'Comic Sans MS, cursive', // Please don't actually do this
 *   },
 * });
 * ```
 */
export function createTheme(customTheme: Partial<ChatSDKTheme>): ChatSDKTheme {
  return {
    colors: { ...defaultTheme.colors, ...customTheme.colors },
    borderRadius: { ...defaultTheme.borderRadius, ...customTheme.borderRadius },
    spacing: { ...defaultTheme.spacing, ...customTheme.spacing },
    fonts: { ...defaultTheme.fonts, ...customTheme.fonts },
    fontSize: { ...defaultTheme.fontSize, ...customTheme.fontSize },
    shadows: { ...defaultTheme.shadows, ...customTheme.shadows },
  } as ChatSDKTheme;
}

/**
 * Generate CSS variables from theme
 * Use this to inject theme values as CSS custom properties
 *
 * @param theme - The theme to convert to CSS variables
 * @returns CSS string with custom properties
 *
 * @example
 * ```typescript
 * const cssVars = themeToCSSVariables(impactIdolTheme);
 * // Inject into <style> tag or CSS file
 * ```
 */
export function themeToCSSVariables(theme: ChatSDKTheme): string {
  return `
    :root {
      /* Colors */
      --chatsdk-color-primary: ${theme.colors.primary};
      --chatsdk-color-primary-hover: ${theme.colors.primaryHover};
      --chatsdk-color-secondary: ${theme.colors.secondary};
      --chatsdk-color-secondary-hover: ${theme.colors.secondaryHover};
      --chatsdk-color-background: ${theme.colors.background};
      --chatsdk-color-surface: ${theme.colors.surface};
      --chatsdk-color-surface-hover: ${theme.colors.surfaceHover};
      --chatsdk-color-border: ${theme.colors.border};
      --chatsdk-color-text: ${theme.colors.text};
      --chatsdk-color-text-secondary: ${theme.colors.textSecondary};
      --chatsdk-color-text-muted: ${theme.colors.textMuted};
      --chatsdk-color-success: ${theme.colors.success};
      --chatsdk-color-error: ${theme.colors.error};
      --chatsdk-color-warning: ${theme.colors.warning};
      --chatsdk-color-info: ${theme.colors.info};

      /* Border Radius */
      --chatsdk-radius-sm: ${theme.borderRadius.sm};
      --chatsdk-radius-md: ${theme.borderRadius.md};
      --chatsdk-radius-lg: ${theme.borderRadius.lg};
      --chatsdk-radius-full: ${theme.borderRadius.full};

      /* Spacing */
      --chatsdk-spacing-xs: ${theme.spacing.xs};
      --chatsdk-spacing-sm: ${theme.spacing.sm};
      --chatsdk-spacing-md: ${theme.spacing.md};
      --chatsdk-spacing-lg: ${theme.spacing.lg};
      --chatsdk-spacing-xl: ${theme.spacing.xl};

      /* Fonts */
      --chatsdk-font-body: ${theme.fonts.body};
      --chatsdk-font-heading: ${theme.fonts.heading};
      --chatsdk-font-mono: ${theme.fonts.mono};

      /* Font Sizes */
      --chatsdk-text-xs: ${theme.fontSize.xs};
      --chatsdk-text-sm: ${theme.fontSize.sm};
      --chatsdk-text-base: ${theme.fontSize.base};
      --chatsdk-text-lg: ${theme.fontSize.lg};
      --chatsdk-text-xl: ${theme.fontSize.xl};
      --chatsdk-text-2xl: ${theme.fontSize['2xl']};

      /* Shadows */
      --chatsdk-shadow-sm: ${theme.shadows.sm};
      --chatsdk-shadow-md: ${theme.shadows.md};
      --chatsdk-shadow-lg: ${theme.shadows.lg};
    }
  `.trim();
}
