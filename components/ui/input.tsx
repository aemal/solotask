"use client";
import { Input as HeroInput } from "@heroui/react";
import { forwardRef, type ComponentProps } from "react";
export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className = "", ...props }, ref) {
  if (props.type === "file" || props.type === "checkbox") return <input ref={ref} className={className} {...props} />;
  return <HeroInput ref={ref} className={`vb-input ${className}`} {...props} />;
});
