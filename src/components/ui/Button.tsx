import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const buttonVariants = {
  base: `
    inline-flex items-center justify-center
    rounded-xl font-medium
    transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  variants: {
    primary: `
      primary-gradient-tb text-white
      border border-transparent
      hover:-translate-y-0.5
      hover:border-white/70
      hover:shadow-lg
      active:translate-y-0
      focus:ring-blue-500
    `,

    secondary: `
      bg-muted text-foreground
      hover:-translate-y-0.5
      hover:shadow-md
      focus:ring-gray-400
    `,

    outline: `
      border border-border text-foreground
      hover:-translate-y-0.5
      hover:shadow-md
      focus:ring-gray-400
    `,

    danger: `
      bg-red-600 text-white
      hover:-translate-y-0.5
      hover:shadow-md
      focus:ring-red-500
    `,
  },

  sizes: {
    sm: 'h-8 px-4 text-sm',
    md: 'h-10 px-6 text-sm',
    lg: 'h-12 px-8 text-base',
  },
};

export default function Button({
  children,
  variant = "primary",
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        buttonVariants.base,
        buttonVariants.variants[variant],
        buttonVariants.sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading && (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      {children}
    </button>
  );
}
