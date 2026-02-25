import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20 focus-visible:ring-destructive/20",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-500 [a&]:hover:bg-emerald-500/20",
        warning:
          "border-transparent bg-amber-500/10 text-amber-500 [a&]:hover:bg-amber-500/20",
        info:
          "border-transparent bg-blue-500/10 text-blue-500 [a&]:hover:bg-blue-500/20",
        // 4 badge random colors for categorization
        color1:
          "border-transparent bg-purple-500/10 text-purple-500 [a&]:hover:bg-purple-500/20",
        color2:
          "border-transparent bg-teal-500/10 text-teal-500 [a&]:hover:bg-teal-500/20",
        color3:
          "border-transparent bg-cyan-500/10 text-cyan-500 [a&]:hover:bg-cyan-500/20",
        color4:
          "border-transparent bg-fuchsia-500/10 text-fuchsia-500 [a&]:hover:bg-fuchsia-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props} />
  );
}

export { Badge, badgeVariants }
