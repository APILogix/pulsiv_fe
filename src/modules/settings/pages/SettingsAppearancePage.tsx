import { useState } from 'react';
import { Monitor, RotateCcw, Check } from 'lucide-react';
import { useTheme, ThemeCard, ThemePreview, THEMES, DEFAULT_THEME_ID } from '@/themes';
import type { ThemeId } from '@/themes';
import { cn } from '@/lib/utils';

/**
 * Settings ▸ Appearance — full theme picker with a live preview.
 * Hovering/focusing a theme card updates the preview before committing.
 */
export default function SettingsAppearancePage() {
  const { theme, setTheme, followSystem, setFollowSystem } = useTheme();
  const [hovered, setHovered] = useState<ThemeId | null>(null);
  const previewId = hovered ?? theme;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Appearance</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Personalize the look of your workspace. Themes apply instantly and are saved to this browser.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
        {/* Theme grid */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-5"
            onMouseLeave={() => setHovered(null)}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text)]">Theme</h3>
              <span className="text-xs text-[var(--text3)]">{THEMES.length} themes</span>
            </div>

            <div
              role="radiogroup"
              aria-label="Color theme"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            >
              {THEMES.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  isActive={theme === t.id}
                  onSelect={setTheme}
                  onPreview={setHovered}
                />
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-5">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">Preferences</h3>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={followSystem}
                onClick={() => setFollowSystem(!followSystem)}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-2.5 text-sm text-[var(--text2)] transition-colors hover:bg-[var(--bg2)]"
              >
                <span className="flex items-center gap-2">
                  <Monitor className="size-4" aria-hidden />
                  Follow system dark mode preference
                </span>
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded border',
                    followSystem
                      ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-fg)]'
                      : 'border-[var(--input)]',
                  )}
                >
                  {followSystem && <Check className="size-3" aria-hidden />}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTheme(DEFAULT_THEME_ID)}
                className="flex items-center gap-2 rounded-md px-2 py-2.5 text-sm text-[var(--text3)] transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text2)]"
              >
                <RotateCcw className="size-4" aria-hidden />
                Reset to default
              </button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Live preview
          </p>
          <ThemePreview themeId={previewId} />
        </div>
      </div>
    </div>
  );
}
