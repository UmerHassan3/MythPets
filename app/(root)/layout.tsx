import React, { ReactNode } from 'react'

import Header from '@/Components/user/Header'
import Footer from '@/Components/user/Footer'
import { CartProvider } from '@/lib/cart/cart-context'

const layout = ({ children }: { children: ReactNode }) => {
  return (
    /* The provider wraps the storefront so the header badge and any product
       tile share one cart. It holds only ids and quantities, so the tree below
       it stays server-rendered. */
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  )
}

export default layout