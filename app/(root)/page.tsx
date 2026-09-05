import Image from "next/image";
import { Suspense } from "react";

import ProductShowcase from "@/Components/user/ProductShowcase";
import { Skeleton } from "@/Components/ui/skeleton";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * The hero renders immediately while the product grid streams in behind a
 * Suspense boundary — the page paints without waiting on the database.
 */
const ProductsFallback = () => (
  <div className="space-y-5">
    <Skeleton className="h-7 w-40" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
      ))}
    </div>
  </div>
);

const page = async() => {
  const session = await auth();
  if(session?.user?.role === 'admin'){
    redirect('/admin/dashboard')
  }
  return (
    <>
      {/* Full-bleed hero. The banner is 3:1, so the aspect ratio is pinned to
          stop it collapsing on narrow screens. */}
      <section className="relative aspect-[3/1] w-full min-h-44 overflow-hidden bg-neutral-950">
        <Image
          src="/Images/banner.png"
          alt="MythPets — trade legendary pets instantly"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <Suspense fallback={<ProductsFallback />}>
          <ProductShowcase />
        </Suspense>
      </div>
    </>
  );
};

export default page;
