import { cn } from "@/lib/utils";
import { LoaderIcon } from "lucide-react";

function Loader({ className }) {
  return (
    <LoaderIcon className={cn("animate-spin", className)} />
  );
}

export { Loader };
