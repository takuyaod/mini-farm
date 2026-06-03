import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-400',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400',
        outline:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400',
        secondary:
          'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-gray-400',
        ghost:
          'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400',
        link: 'text-gray-700 underline-offset-4 hover:underline focus-visible:ring-gray-400',
        green:
          'bg-[#246e3a] text-white hover:bg-[#1c5a2f] focus-visible:ring-green-400',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 py-1.5',
        lg: 'px-6 py-2.5 text-base',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
