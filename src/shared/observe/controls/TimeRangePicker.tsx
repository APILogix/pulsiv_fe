import { useState, useRef, useEffect } from "react";
import { Clock, Calendar, ChevronDown, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTimeRangeParams,
  PRESET_OPTIONS,
  type PresetRange,
} from "./useTimeRangeParams";

const getInitialFromDate = () => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const getInitialToDate = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function TimeRangePicker({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    timeRangeState,
    setPresetRange,
    setCustomRange,
    resetToDefault,
    activeLabel,
  } = useTimeRangeParams();

  const [activeTab, setActiveTab] = useState<"preset" | "custom">(timeRangeState.mode);

  // Sync internal tab state when URL mode changes
  useEffect(() => {
    setActiveTab(timeRangeState.mode);
  }, [timeRangeState.mode]);

  // Local state for custom datetime inputs
  const [customFrom, setCustomFrom] = useState(() => {
    if (timeRangeState.from) {
      return timeRangeState.from.slice(0, 16);
    }
    return getInitialFromDate();
  });

  const [customTo, setCustomTo] = useState(() => {
    if (timeRangeState.to) {
      return timeRangeState.to.slice(0, 16);
    }
    return getInitialToDate();
  });

  // Close popover on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectPreset = (preset: PresetRange) => {
    setPresetRange(preset);
    setIsOpen(false);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom) return;

    const fromIso = new Date(customFrom).toISOString();
    const toIso = customTo ? new Date(customTo).toISOString() : new Date().toISOString();

    setCustomRange(fromIso, toIso);
    setIsOpen(false);
  };

  const handleReset = () => {
    resetToDefault();
    setCustomFrom(getInitialFromDate());
    setCustomTo(getInitialToDate());
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg1)] px-3 py-1.5 font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)] transition-colors hover:border-[var(--text3)] hover:bg-[var(--bg2)] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]",
          isOpen && "border-[var(--brand)] bg-[var(--bg2)]"
        )}
      >
        <Clock className="size-3.5 text-[var(--brand)] shrink-0" />
        <span>{activeLabel}</span>
        <ChevronDown className={cn("size-3.5 text-[var(--text3)] transition-transform duration-150", isOpen && "rotate-180")} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] shadow-xl animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Segment Switcher */}
          <div className="flex border-b border-[var(--border)] p-1 bg-[var(--bg2)]/60 rounded-t-[var(--radius-lg)]">
            <button
              type="button"
              onClick={() => setActiveTab("preset")}
              className={cn(
                "flex-1 rounded-[var(--radius)] py-1 text-center font-[family-name:var(--mono)] text-[11px] font-medium transition-colors cursor-pointer",
                activeTab === "preset"
                  ? "bg-[var(--bg1)] text-[var(--text)] shadow-xs"
                  : "text-[var(--text3)] hover:text-[var(--text2)]"
              )}
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={cn(
                "flex-1 rounded-[var(--radius)] py-1 text-center font-[family-name:var(--mono)] text-[11px] font-medium transition-colors cursor-pointer",
                activeTab === "custom"
                  ? "bg-[var(--bg1)] text-[var(--text)] shadow-xs"
                  : "text-[var(--text3)] hover:text-[var(--text2)]"
              )}
            >
              Custom Range
            </button>
          </div>

          {/* Preset Options */}
          {activeTab === "preset" && (
            <div className="p-2 space-y-0.5">
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = timeRangeState.mode === "preset" && timeRangeState.range === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectPreset(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-2 text-[12px] font-medium transition-colors cursor-pointer",
                      isSelected
                        ? "bg-[var(--brand)]/10 text-[var(--brand)] font-semibold"
                        : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="size-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom Date Form */}
          {activeTab === "custom" && (
            <form onSubmit={handleApplyCustom} className="p-3 space-y-3">
              <div className="space-y-1">
                <label htmlFor="customFrom" className="block text-[11px] font-mono font-medium text-[var(--text3)] uppercase tracking-wider">
                  From
                </label>
                <div className="relative flex items-center">
                  <input
                    id="customFrom"
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full h-8 rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg2)] px-2 text-[11px] font-mono text-[var(--text)] focus:border-[var(--brand)] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="customTo" className="block text-[11px] font-mono font-medium text-[var(--text3)] uppercase tracking-wider">
                  To
                </label>
                <div className="relative flex items-center">
                  <input
                    id="customTo"
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full h-8 rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg2)] px-2 text-[11px] font-mono text-[var(--text)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset to 24h</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--brand)] px-3 py-1 text-[11px] font-medium text-[var(--bg)] shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Calendar className="size-3" />
                  <span>Apply</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
