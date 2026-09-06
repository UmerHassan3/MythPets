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
      {/* Brand panel: a landscape banner above the form on mobile, a
          full-height portrait column beside it on desktop.

          The two artworks are different crops, not one image scaled — so this
          is `<picture>` with a media condition rather than two <Image>
          elements toggled by CSS. A hidden <Image> is still fetched by most
          browsers, which would cost both files on every visit; this fetches
          exactly one. */}
      <div className="aspect-[9/5] w-full bg-neutral-950 sm:aspect-[12/5] lg:sticky lg:top-0 lg:aspect-auto lg:h-dvh">
        <div className="relative size-full overflow-hidden">
          <picture>
            <source
              media="(min-width: 1024px)"
              srcSet="/Images/auth-desktop.webp"
              width={1920}
              height={2400}
            />
            <img
              src="/Images/auth-mobile.webp"
              alt="MythPets — Adopt Me trading"
              width={2160}
              height={1200}
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover"
            />
          </picture>
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
