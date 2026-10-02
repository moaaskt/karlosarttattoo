import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  extraActionLabel?: string;
  onConfirm?: () => void;
  onExtraAction?: () => void;
  onCancel?: () => void;
  variant?: "danger" | "warning" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  extraActionLabel,
  onConfirm,
  onExtraAction,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-start justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded ${
                  variant === "danger"
                    ? "bg-red-500/20 text-red-400"
                    : variant === "warning"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-[#9be5ff]/20 text-[#9be5ff]"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <Dialog.Title className="text-sm font-extrabold uppercase tracking-[0.15em] text-white">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                onClick={onCancel}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="py-4 text-xs text-neutral-300 leading-relaxed">
            {description}
          </Dialog.Description>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>

            {extraActionLabel && onExtraAction && (
              <button
                onClick={() => {
                  onExtraAction();
                  onOpenChange(false);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-colors cursor-pointer"
              >
                {extraActionLabel}
              </button>
            )}

            {onConfirm && (
              <button
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  variant === "danger"
                    ? "bg-red-600 hover:bg-red-500 text-white border-red-500"
                    : variant === "warning"
                    ? "bg-amber-500 hover:bg-amber-400 text-black border-amber-400"
                    : "bg-[#9be5ff] hover:bg-[#b0ecff] text-[#070707] border-[#9be5ff]"
                }`}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
