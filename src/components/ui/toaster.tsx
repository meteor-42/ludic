import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, Info, TriangleAlert } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, variant, icon, ...props }) {
        return (
          <Toast key={id} {...props} variant={variant as any} className="w-full max-w-[560px] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {variant === 'destructive' ? (
                  <TriangleAlert className="h-4 w-4 text-red-600" />
                ) : icon === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : icon === 'loading' ? (
                  <svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                ) : (
                  <Info className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="grid gap-1">
                {title && <ToastTitle className="text-sm font-semibold">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs text-muted-foreground">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="top-4 left-1/2 -translate-x-1/2 right-auto sm:right-auto md:max-w-[560px]" />
    </ToastProvider>
  )
}
