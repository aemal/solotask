"use client";
import { Button as HeroButton } from "@heroui/react";
import { forwardRef, type ComponentProps } from "react";
type Props = Omit<ComponentProps<typeof HeroButton>, "className"> & { className?: string; disabled?: boolean; title?: string; role?: React.AriaRole; tabIndex?: number };
export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ disabled, className = "", variant, type = "button", ...props }, ref) {
  const primary = /primary-button|composer-send|sample-primary/.test(className);
  return <HeroButton ref={ref} type={type} variant={variant ?? (primary ? "primary" : "ghost")} isDisabled={disabled ?? props.isDisabled} className={`vb-button ${className}`} {...props} />;
});
