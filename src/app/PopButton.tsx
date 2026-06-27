import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";
type Size = "lg" | "md" | "sm";

const variants: Record<Variant, string> = {
  primary:
    "bg-indigo-ai text-white border-indigo-deep shadow-md shadow-indigo-ai/20",
  secondary: "bg-card text-indigo-ai border-border hover:border-indigo-soft",
};

const sizes: Record<Size, string> = {
  lg: "h-14 px-8 text-base",
  md: "h-12 px-6 text-sm",
  sm: "h-11 px-5 text-sm",
};

const base =
  "btn-pop inline-flex items-center justify-center uppercase tracking-wide disabled:opacity-60";

type PopLinkProps = { variant?: Variant; size?: Size } & ComponentProps<typeof Link>;

export function PopLink({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  ...props
}: PopLinkProps) {
  return (
    <Link
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

type PopButtonProps = { variant?: Variant; size?: Size } & ComponentProps<"button">;

export function PopButton({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  ...props
}: PopButtonProps) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
