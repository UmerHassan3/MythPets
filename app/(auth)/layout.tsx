import { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Split auth shell: brand panel beside the form on desktop, stacked on mobile.
 *
 * Server Component — this is pure chrome, so it ships no JavaScript. The form
 * islands inside `children` are the only interactive parts.
 */
const layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel. On mobile it becomes a capped banner above the form so
          the portrait artwork cannot push the inputs below the fold. */}
      {/* The outer element is the sticky one; `fill` needs a parent with
          position relative/absolute/fixed, and `sticky` is none of those —
          hence the inner wrapper. */}
      <div className="h-44 w-full bg-neutral-950 sm:h-56 lg:sticky lg:top-0 lg:h-dvh">
        <div className="relative size-full overflow-hidden">
          <Image
            src="/Images/auth.jpeg"
            alt="MythPets — Adopt Me trading"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-top lg:object-center"
          />
        </div>
      </div>

      {/* Form column */}
      <div className="flex flex-col justify-center bg-background px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          {children}

          <p className="mt-10 text-center text-xs text-muted-foreground">
            <Link
              href="/"
              className="rounded transition-colors hover:text-foreground"
            >
              Back to MythPets
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default layout
