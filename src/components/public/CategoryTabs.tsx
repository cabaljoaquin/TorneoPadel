'use client'

import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface CategoryTabsProps {
  categories: { id: string; name: string }[]
  onTabClick?: (id: string) => void
}

function CategoryTabsContent({ categories, onTabClick }: CategoryTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCat = searchParams.get('cat') || categories[0]?.id

  return (
    <div className="flex px-4 overflow-x-auto no-scrollbar gap-2 pb-2">
      {categories.map((cat) => {
        const isActive = currentCat === cat.id

        return (
          <button
            key={cat.id}
            onClick={() => onTabClick ? onTabClick(cat.id) : router.push(`?cat=${cat.id}`, { scroll: false })}
            className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-brand-600 rounded-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{cat.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function CategoryTabs(props: CategoryTabsProps) {
  return (
    <Suspense fallback={<div className="h-10 animate-pulse bg-surface-card rounded-full mx-4" />}>
      <CategoryTabsContent {...props} />
    </Suspense>
  )
}

