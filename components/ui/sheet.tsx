"use client";
import * as React from "react";
import { Modal } from "@heroui/react";
import { X } from "lucide-react";
const SheetState = React.createContext({ open: false, onOpenChange: (_open: boolean) => {} });
export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  return <SheetState.Provider value={{ open, onOpenChange }}>{children}</SheetState.Provider>;
}
export const SheetTitle = Modal.Heading;
export function SheetDescription(props: React.ComponentProps<"p">) { return <p slot="description" {...props}/>; }
export function SheetContent({ children, className = "", dismissable = true, closeLabel = "Close task" }: { children: React.ReactNode; className?: string; dismissable?: boolean; closeLabel?: string }) {
  const state = React.useContext(SheetState);
  return <Modal.Backdrop isDismissable={dismissable} isOpen={state.open} onOpenChange={state.onOpenChange} className="vb-sheet-backdrop"><Modal.Container className="vb-sheet-container"><Modal.Dialog className={`vb-sheet-dialog ${className}`}><Modal.CloseTrigger className="sheet-close" aria-label={closeLabel}><X size={20}/></Modal.CloseTrigger>{children}</Modal.Dialog></Modal.Container></Modal.Backdrop>;
}
