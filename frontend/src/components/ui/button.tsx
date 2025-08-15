import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const getVariantClasses = (variant: ButtonProps["variant"]) => {
  switch (variant) {
    case "outline":
      return "border border-gray-300 bg-white hover:bg-gray-50 text-gray-900"
    case "secondary":
      return "bg-gray-100 text-gray-900 hover:bg-gray-200"
    case "ghost":
      return "hover:bg-gray-100 text-gray-900"
    case "link":
      return "text-blue-600 underline-offset-4 hover:underline"
    case "destructive":
      return "bg-red-600 text-white hover:bg-red-700"
    default:
      return "bg-blue-600 text-white hover:bg-blue-700"
  }
}

const getSizeClasses = (size: ButtonProps["size"]) => {
  switch (size) {
    case "sm":
      return "h-8 px-3 text-sm"
    case "lg":
      return "h-10 px-6"
    case "icon":
      return "h-9 w-9"
    default:
      return "h-9 px-4"
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", asChild, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
    const variantClasses = getVariantClasses(variant)
    const sizeClasses = getSizeClasses(size)
    
    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// Export buttonVariants pour la compatibilité avec calendar.tsx
const buttonVariants = (props: { variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; className?: string }) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
  const variantClasses = getVariantClasses(props.variant)
  const sizeClasses = getSizeClasses(props.size)
  return `${baseClasses} ${variantClasses} ${sizeClasses} ${props.className || ""}`
}

export { Button, buttonVariants }
