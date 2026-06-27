'use client'

import { useState, useSyncExternalStore } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  id: string
}

export function PasswordInput({
  id,
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const inputClassName = cn(
    'h-10 border-wa-border bg-wa-surface text-wa-text placeholder:text-wa-muted focus-visible:border-wa-green focus-visible:ring-wa-green/25',
    mounted && 'pr-10',
    className,
  )

  if (!mounted) {
    return (
      <Input
        id={id}
        type="password"
        className={inputClassName}
        {...props}
      />
    )
  }

  return (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        className={inputClassName}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-wa-muted transition-colors hover:bg-wa-elevated hover:text-wa-text"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  )
}
