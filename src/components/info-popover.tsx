'use client'

import { useState, useRef, type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface InfoPopoverProps {
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  width?: string
}

/**
 * Reusable info icon that shows explanatory content on hover.
 *
 * Uses @radix-ui/react-popover controlled via open state:
 * - Opens on mouseenter of the trigger icon
 * - Closes on mouseleave with a small delay so the user can move into the panel
 * - Panel's own mouseenter/leave cancels/restarts the close timer (no flicker)
 * - Rendered in a Portal → never clips against card overflow or page header
 */
export function InfoPopover({
  children,
  side = 'bottom',
  align = 'start',
  width = 'w-80',
}: InfoPopoverProps) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          aria-label="More information"
          onMouseEnter={() => { cancelClose(); setOpen(true) }}
          onMouseLeave={scheduleClose}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={`${width} text-xs`}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        // Prevent Radix from closing when focus leaves the trigger
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
