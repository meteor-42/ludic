import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  odd?: number;
}

export const Chip = ({ label, selected, onClick, disabled, odd }: ChipProps) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "px-4 py-3 rounded-md border transition-colors h-10 w-10 flex flex-col items-center justify-center",
      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    <span className="text-base">{label}</span>
    {odd != null && (
      <span className="text-xs text-muted-foreground mt-1">{odd.toFixed(2)}</span>
    )}
  </button>
);
