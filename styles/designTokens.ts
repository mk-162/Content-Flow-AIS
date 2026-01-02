/**
 * MissionContent Design Tokens
 *
 * Centralized design system constants for consistent styling across the application.
 * Import these tokens instead of hardcoding Tailwind classes.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Primary brand color
  primary: {
    DEFAULT: 'cyan-500',
    light: 'cyan-400',
    dark: 'cyan-600',
    bg: 'cyan-500/10',
    border: 'cyan-500/30',
  },

  // Secondary accent (for credits, AI features)
  accent: {
    DEFAULT: 'indigo-500',
    light: 'indigo-400',
    dark: 'indigo-600',
    bg: 'indigo-500/10',
    border: 'indigo-500/30',
  },

  // Status colors
  status: {
    success: 'emerald-500',
    successLight: 'emerald-400',
    warning: 'amber-500',
    warningLight: 'amber-400',
    error: 'red-500',
    errorLight: 'red-400',
    info: 'cyan-400',
  },

  // Surface colors (backgrounds)
  surface: {
    base: 'slate-950',        // #020617 - deepest background
    raised: 'slate-900',      // #0f172a - cards, panels
    elevated: 'slate-800',    // #1e293b - hover states, secondary panels
    overlay: 'slate-700',     // #334155 - borders, dividers
  },

  // Text colors
  text: {
    primary: 'slate-100',     // Main content
    secondary: 'slate-400',   // Supporting text
    muted: 'slate-500',       // Disabled, hints
    disabled: 'slate-600',    // Disabled elements
  },
} as const;

// =============================================================================
// SPACING SCALE
// =============================================================================

export const spacing = {
  // Component internal padding
  component: {
    xs: 'p-2',          // 8px - tight elements like badges
    sm: 'p-3',          // 12px - compact buttons, inputs
    md: 'p-4',          // 16px - standard cards, sections
    lg: 'p-6',          // 24px - large sections, modals
    xl: 'p-8',          // 32px - page sections
  },

  // Horizontal padding (common for containers)
  px: {
    sm: 'px-3',
    md: 'px-4',
    lg: 'px-6',
    xl: 'px-8',
  },

  // Gaps between elements
  gap: {
    xs: 'gap-1',        // 4px
    sm: 'gap-2',        // 8px - tight groups
    md: 'gap-3',        // 12px - button groups
    lg: 'gap-4',        // 16px - section elements
    xl: 'gap-6',        // 24px - major sections
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Headings
  h1: 'text-2xl font-bold text-slate-100 tracking-tight',
  h2: 'text-xl font-bold text-slate-100',
  h3: 'text-lg font-semibold text-slate-200',
  h4: 'text-base font-semibold text-slate-200',

  // Body text
  body: 'text-sm text-slate-300',
  bodySmall: 'text-xs text-slate-400',

  // Labels
  label: 'text-xs font-medium text-slate-400 uppercase tracking-wider',
  labelSm: 'text-[10px] font-bold text-slate-500 uppercase tracking-widest',

  // Special
  mono: 'font-mono text-sm',
  code: 'font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded text-pink-400',
} as const;

// =============================================================================
// BUTTONS
// =============================================================================

export const button = {
  // Base styles applied to all buttons
  base: 'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed',

  // Size variants
  size: {
    xs: 'px-2 py-1 text-[10px]',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-xs',
    xl: 'px-6 py-3 text-sm',
  },

  // Color variants
  variant: {
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200',
    outline: 'bg-transparent border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white',
  },

  // Special action buttons
  action: {
    approve: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    reject: 'bg-slate-700 hover:bg-slate-600 text-slate-300',
    delete: 'bg-red-600 hover:bg-red-500 text-white',
    generate: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    launch: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
} as const;

// =============================================================================
// FORM ELEMENTS
// =============================================================================

export const form = {
  // Input fields
  input: {
    base: 'w-full bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors',
    sm: 'px-3 py-2',
    md: 'px-4 py-2.5',
    lg: 'px-4 py-3',
  },

  // Textarea
  textarea: 'w-full bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors resize-y min-h-[100px]',

  // Select
  select: 'w-full bg-slate-950 border border-slate-700 text-sm text-slate-200 focus:border-cyan-500 outline-none appearance-none',

  // Checkbox
  checkbox: 'appearance-none w-4 h-4 border border-slate-600 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer',

  // Labels
  label: 'block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2',
} as const;

// =============================================================================
// CARDS & CONTAINERS
// =============================================================================

export const card = {
  // Base card (no rounding - sharp geometric look)
  base: 'bg-slate-900 border border-slate-800',

  // Interactive card
  interactive: 'bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer',

  // Elevated card
  elevated: 'bg-slate-900 border border-slate-700 shadow-xl',

  // Panel (sidebar sections)
  panel: 'bg-slate-900/50 border-b border-slate-800',
} as const;

// =============================================================================
// MODALS
// =============================================================================

export const modal = {
  // Backdrop (consistent opacity)
  backdrop: 'fixed inset-0 bg-black/75 backdrop-blur-sm z-50',

  // Modal container
  container: 'fixed inset-0 flex items-center justify-center z-50 p-4',

  // Modal content
  content: 'bg-slate-900 border border-slate-700 w-full max-w-md shadow-2xl',
  contentLg: 'bg-slate-900 border border-slate-700 w-full max-w-lg shadow-2xl',
  contentXl: 'bg-slate-900 border border-slate-700 w-full max-w-xl shadow-2xl',
  content2xl: 'bg-slate-900 border border-slate-700 w-full max-w-2xl shadow-2xl',
  content3xl: 'bg-slate-900 border border-slate-700 w-full max-w-3xl shadow-2xl',

  // Modal header
  header: 'px-6 py-4 border-b border-slate-800',

  // Modal body
  body: 'p-6',

  // Modal footer
  footer: 'px-6 py-4 border-t border-slate-800 flex gap-3',
} as const;

// =============================================================================
// STATUS BADGES
// =============================================================================

export const badge = {
  base: 'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',

  variant: {
    default: 'bg-slate-800 text-slate-400',
    primary: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border border-red-500/20',
    info: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  },
} as const;

// =============================================================================
// LOADING STATES
// =============================================================================

export const loading = {
  // Spinner (for buttons, inline)
  spinner: 'w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin',
  spinnerLg: 'w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin',

  // Bar (for progress indicators)
  bar: 'h-1 bg-slate-700 rounded-full overflow-hidden',
  barFill: 'h-full bg-cyan-500 rounded-full',

  // Skeleton
  skeleton: 'bg-slate-800 animate-pulse',
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transition = {
  fast: 'transition-all duration-150',
  default: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  colors: 'transition-colors duration-200',
} as const;

// =============================================================================
// FOCUS STATES
// =============================================================================

export const focus = {
  ring: 'focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
  outline: 'focus:outline-none focus:border-cyan-500',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadow = {
  sm: 'shadow-lg shadow-black/20',
  md: 'shadow-xl shadow-black/25',
  lg: 'shadow-2xl shadow-black/30',
} as const;

// =============================================================================
// HELPER: Class combiner
// =============================================================================

export const cx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// =============================================================================
// PRESET COMPONENT STYLES
// =============================================================================

export const presets = {
  // Primary CTA button
  buttonPrimary: `${button.base} ${button.size.md} ${button.variant.primary}`,
  buttonSecondary: `${button.base} ${button.size.md} ${button.variant.secondary}`,

  // Standard input
  inputMd: `${form.input.base} ${form.input.md}`,

  // Modal with common sizing
  modalMd: `${modal.backdrop}`,
} as const;
