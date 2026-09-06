import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import ProductShowcase from "@/Components/user/ProductShowcase";
import TrustBar from "@/Components/user/home/TrustBar";
import HowItWorks from "@/Components/user/home/HowItWorks";
import HomeReviews from "@/Components/user/home/HomeReviews";
import { Button } from "@/Components/ui/button";
import { Skeleton } from "@/Components/ui/skeleton";

/**
 * Each database-backed section streams behind its own Suspense boundary, so a
 * slow query on one never blocks the rest of the page from painting.
 */
const ProductsFallback = () => (
  <div className="space-y-5">
    <Skeleton className="h-8 w-48" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
      ))}
    </div>
  </div>
);

const page = async () => {
  const session = await auth();
  if (session?.user?.role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <>
      {/* Hero. The artwork carries the headline and trust chips but no buttons,
          so the CTAs below are the only ones on the page — real controls rather
          than pixels. The banner itself also links through. */}
      {/* The dark background only backs the image itself — it shows while the
          artwork loads and prevents a white flash, and ends exactly where the
          image does. */}
      <Link
        href="/adopt-me"
        aria-label="Browse Adopt Me pets"
        className="relative block aspect-[9/10] w-full overflow-hidden bg-neutral-950 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 md:aspect-[3/1]"
      >
          {/* Two different crops, not one image scaled — portrait on phones,
              wide banner from tablet up. `<picture>` with a media condition so
              the browser fetches exactly one; two <Image> elements toggled by
              CSS would download both. */}
          <picture>
            <source
              media="(min-width: 768px)"
              srcSet="/Images/hero-desktop.webp"
              width={3840}
              height={1280}
            />
            <img
              src="/Images/hero-mobile.webp"
              alt="Your next pet is one trade away — hundreds of in-game pets and items, priced up front."
              width={2160}
              height={2400}
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover"
            />
          </picture>
      </Link>

      {/* On the page background, not the hero's. Keeping these inside the dark
          section left a black slab below the artwork once the image ended. */}
      <div className="mx-auto flex max-w-6xl flex-wrap gap-3 px-4 py-6 md:px-6">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/adopt-me" />}
          className="gap-2 bg-red-600 text-white hover:bg-red-500"
        >
          Browse pets
          <ArrowRight className="size-4" />
        </Button>

        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={<Link href="#how-it-works" />}
        >
          How trading works
        </Button>
      </div>

      <TrustBar />

      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <Suspense fallback={<ProductsFallback />}>
          <ProductShowcase />
        </Suspense>
      </div>

      <HowItWorks />

      {/* No fallback: this renders nothing when there are no reviews, and a
          skeleton for content that may not exist would be misleading. */}
      <Suspense fallback={null}>
        <HomeReviews />
      </Suspense>

      {/* Closing call to action, so the page ends with somewhere to go rather
          than trailing off into the footer. */}
      <section className="border-t bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-6 md:py-16">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to grow your collection?
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Live stock, fair prices, delivered in-game by a real trader.
            </p>
          </div>

          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/adopt-me" />}
            className="gap-2 bg-red-600 text-white hover:bg-red-500"
          >
            Browse all pets
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
};

export default page;
