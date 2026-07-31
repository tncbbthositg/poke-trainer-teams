import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export function Tooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 rounded border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 py-1 text-xs shadow"
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-[rgb(var(--panel))]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
