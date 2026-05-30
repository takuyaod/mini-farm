import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-900 text-white',
        secondary: 'bg-gray-100 text-gray-700',
        outline: 'border border-gray-200 text-gray-700',
        destructive: 'bg-red-500 text-white',
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
        red: 'bg-red-100 text-red-700',
        amber: 'bg-amber-100 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
