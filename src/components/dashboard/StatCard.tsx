import { Separator } from "@/components/ui/separator";

interface StatCardProps {
  value: number | string;
  label: string;
  loading?: boolean;
}

export const StatCard = ({ value, label, loading = false }: StatCardProps) => (
  <div className="flex flex-col items-center justify-center w-20 h-20 bg-background border border-border rounded-lg overflow-hidden">
    <div className="flex-1 flex items-center justify-center w-full">
      <span className="text-xl">{loading ? "..." : value}</span>
    </div>
    <Separator />
    <div className="w-full bg-muted/30 px-2 py-1 flex items-center justify-center">
      <span className="text-xs text-muted-foreground ">{label}</span>
    </div>
  </div>
);
