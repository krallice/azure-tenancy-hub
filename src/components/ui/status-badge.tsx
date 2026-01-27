import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  variant: "default" | "modified" | "tenant" | "enabled" | "disabled" | "configured";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  default: "bg-muted text-muted-foreground",
  modified: "bg-primary text-primary-foreground",
  tenant: "bg-secondary text-secondary-foreground",
  enabled: "bg-chart-1/20 text-chart-1 border border-chart-1/30",
  disabled: "bg-destructive/20 text-destructive border border-destructive/30",
  configured: "bg-primary/20 text-primary border border-primary/30",
};

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
