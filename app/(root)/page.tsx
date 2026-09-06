import Image from "next/image";
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
      {/* Hero. The banner carries its own headline, so the overlay adds only a
          call to action — competing text would fight the artwork. */}
      <section className="relative min-h-44 w-full overflow-hidden bg-neutral-950 aspect-[3/1]">
        <Image
          src="/Images/banner.png"
          alt="MythPets — trade legendary pets instantly"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-neutral-950/80 to-transparent"
        />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-6xl justify-center px-4 pb-5 md:justify-start md:px-6 md:pb-8">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/adopt-me" />}
              className="gap-2 bg-red-600 text-white shadow-lg shadow-red-950/30 hover:bg-red-500"
            >
              Shop Adopt Me pets
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

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
