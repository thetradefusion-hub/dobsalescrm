'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import {
  BRAND_LOGO_DARK,
  BRAND_LOGO_LIGHT,
  BRAND_NAME,
} from '@/lib/brand'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

/** Horizontal brand mark that swaps for light vs dark theme. */
export function BrandLogo({
  width = 148,
  height = 32,
  className,
  priority,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Avoid hydration mismatch — default to dark (app defaultTheme) until mounted.
  const src =
    mounted && resolvedTheme === 'light' ? BRAND_LOGO_LIGHT : BRAND_LOGO_DARK

  return (
    <Image
      src={src}
      alt={BRAND_NAME}
      width={width}
      height={height}
      className={cn('object-contain object-left', className)}
      priority={priority}
    />
  )
}
