"use client";
import { TextArea as HeroTextArea } from "@heroui/react";
import { forwardRef, type ComponentProps } from "react";
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className = "", ...props }, ref) {
  return <HeroTextArea ref={ref} data-slot="textarea" className={`ui-textarea ${className}`} {...props} />;
});
