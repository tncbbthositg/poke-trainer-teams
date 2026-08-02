import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { CSSProperties, ReactNode } from "react";

export function Tooltip({
  label,
  content,
  children,
  contentClassName,
  contentStyle,
}: {
  label?: string;
  content?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className={
              contentClassName ??
              "z-50 rounded border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 py-1 text-xs shadow"
            }
            style={contentStyle}
          >
            {content ?? label}
            <TooltipPrimitive.Arrow className="fill-[rgb(var(--panel))]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
