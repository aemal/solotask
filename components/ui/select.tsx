"use client";
import * as React from "react";
import { Select as HeroSelect, ListBox } from "@heroui/react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
export function Select({ value, defaultValue, onValueChange, disabled, open, onOpenChange, children }: { value?: string; defaultValue?: string; onValueChange?: (value: string) => void; disabled?: boolean; open?: boolean; onOpenChange?: (open:boolean)=>void; children: React.ReactNode }) {
  const trigger = React.Children.toArray(children).find(child => React.isValidElement(child) && child.type === SelectTrigger) as React.ReactElement<{ "aria-label"?: string }> | undefined;
  return <HeroSelect className="vb-select" aria-label={trigger?.props["aria-label"] ?? "Choose option"} value={value} defaultValue={defaultValue} onChange={key => { if (key !== null) onValueChange?.(String(key)); }} isDisabled={disabled} isOpen={open} onOpenChange={onOpenChange}>{children}</HeroSelect>;
}
export function SelectValue(props: React.ComponentProps<typeof HeroSelect.Value>) { return <HeroSelect.Value {...props} />; }
export function SelectTrigger({ className, children, ...props }: Omit<React.ComponentProps<typeof HeroSelect.Trigger>, "className" | "children"> & { className?: string; children?: React.ReactNode }) {
  return <HeroSelect.Trigger className={cn("select-trigger", className)} {...props}>{children}<HeroSelect.Indicator><ChevronDown size={14}/></HeroSelect.Indicator></HeroSelect.Trigger>;
}
export function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <HeroSelect.Popover className={cn("vb-select-popover", className)}><ListBox aria-label="Options">{children}</ListBox></HeroSelect.Popover>;
}
export function SelectItem({ value, className, children, textValue }: { value: string; className?: string; children: React.ReactNode; textValue?: string }) {
  return <ListBox.Item id={value} textValue={textValue ?? (typeof children === "string" ? children : value)} className={cn("vb-select-item", className)}>{children}<ListBox.ItemIndicator /></ListBox.Item>;
}
export function FilterSelect({ label, value, onValueChange, options, icon: Icon }: { label: string; value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[]; icon: LucideIcon }) {
  return <Select value={value} onValueChange={onValueChange}><SelectTrigger aria-label={label}><Icon size={15} aria-hidden="true"/><SelectValue/></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}
