import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Visual scale (AGENTS.md): bg-card on the content canvas (bg-canvas), a 1px border-border in both themes
// (`plain` drops it), no shadow. Header px-8 py-6 with a divider; rows px-8 py-5.

function Card({
  className,
  plain = false,
  ...props
}: React.ComponentProps<"div"> & { plain?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card text-card-foreground",
        !plain && "border border-border",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-8 py-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("text-lg leading-snug font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
}

/** «Переглянути всі →» in the right corner of a card header. */
function CardHeaderLink({
  className,
  children = "Переглянути всі",
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="card-header-link"
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {children}
      <ArrowRightIcon className="size-4" aria-hidden="true" />
    </Link>
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-8 py-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 border-t px-8 py-5", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardHeaderLink,
  CardContent,
}
