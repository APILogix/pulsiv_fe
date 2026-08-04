import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent outline-none transition-all duration-300 ease-in-out",
        "focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "bg-[#1b1b1b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] data-[state=checked]:border-[#d4d4d4] data-[state=checked]:bg-[#ededed]",
        "data-[size=default]:h-7 data-[size=default]:w-12 data-[size=sm]:h-5 data-[size=sm]:w-9",
        "active:scale-[0.96]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full ring-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "bg-[#f5f5f5] shadow-[0_1px_3px_rgba(0,0,0,0.45)] data-[state=checked]:bg-[#0a0a0a] data-[state=checked]:shadow-[0_1px_3px_rgba(255,255,255,0.18)]",
          "group-data-[size=default]/switch:size-6 group-data-[size=sm]/switch:size-4",
          "group-data-[size=default]/switch:data-[state=checked]:translate-x-[22px] group-data-[size=sm]/switch:data-[state=checked]:translate-x-4",
          "group-data-[size=default]/switch:data-[state=unchecked]:translate-x-0.5 group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-0.5",
          "group-active/switch:scale-90"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
