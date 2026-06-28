import { createContext, type ReactNode } from 'react';
import { THEMES } from './constants';
import type { ThemeConfig } from './types';

/**
 * Theme *configuration* context.
 *
 * Per the React 19 rules, Context is reserved for **static** data. The theme
 * registry (the ten theme definitions + metadata) never changes at runtime,
 * so it is a perfect Context citizen. Dynamic state (the *current* theme) lives
 * in the Zustand store instead — switching themes therefore never re-renders
 * consumers of this context.
 */

export interface ThemeContextValue {
  availableThemes: ThemeConfig[];
}

// Module-level constant — stable reference, never recreated.
const CONTEXT_VALUE: ThemeContextValue = { availableThemes: THEMES };

export const ThemeContext = createContext<ThemeContextValue>(CONTEXT_VALUE);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={CONTEXT_VALUE}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
