import React, { ReactNode } from 'react'

import Header from '@/Components/user/Header'
import Footer from '@/Components/user/Footer'

const layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default layout