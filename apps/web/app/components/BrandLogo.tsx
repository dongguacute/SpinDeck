import { Disc3 } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_STYLES = {
  sm: { container: "w-7 h-7 rounded-lg", icon: "w-4 h-4" },
  md: { container: "w-9 h-9 rounded-xl", icon: "w-5 h-5" },
  lg: { container: "w-12 h-12 rounded-xl", icon: "w-7 h-7" },
} as const;

export function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  const { container, icon } = SIZE_STYLES[size];

  return (
    <div
      className={`${container} border flex items-center justify-center transition-colors duration-200 ${className}`}
      style={{
        background: "linear-gradient(to bottom right, var(--surface-hover), var(--surface-color))",
        borderColor: "var(--border-color)",
      }}
    >
      <Disc3 className={icon} style={{ color: "var(--text-secondary)" }} />
    </div>
  );
}
