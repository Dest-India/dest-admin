import { Badge } from "./badge";

export function DualBadge({ x, y, variant = "default" }) {
  return (
    <div className="flex items-center capitalize">
      <Badge variant={variant} className="rounded-r-none border-r">{x}</Badge>
      <Badge variant={variant} className="rounded-l-none border-l-0">{y}</Badge>
    </div>
  );
}