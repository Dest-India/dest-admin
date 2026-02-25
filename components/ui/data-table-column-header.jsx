"use client";

import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip } from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "./tooltip";

export function DataTableColumnHeader({ column, title, className }) {
  const canSort = column.getCanSort();
  const canHide = column.getCanHide();
  const sorted = column.getIsSorted();

  const renderSortIcon = () => {
    if (!canSort) {
      return <ChevronsUpDown />;
    }

    if (sorted === "asc") {
      return <ChevronUp className="text-foreground" />;
    }

    if (sorted === "desc") {
      return <ChevronDown className="text-foreground" />;
    }

    return <ChevronsUpDown />;
  };

  const handleSortToggle = () => {
    if (!canSort) {
      return;
    }

    column.toggleSorting(sorted === "asc");
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-2 text-sm font-semibold text-foreground",
        className
      )}
      onClick={handleSortToggle}
      disabled={!canSort}
    >
      {title}
      <div className="flex items-center">
        {canHide ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 md:hidden group-hover:flex [&>svg]:size-3.5! transition-all duration-300"
                onClick={() => column.toggleVisibility(false)}
              >
                {column.getIsVisible() ? <EyeOff /> : <Eye />}
                <span className="sr-only">Hide column</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>Hide column</span>
            </TooltipContent>
          </Tooltip>
        ) : null}
        {canSort && (
          <div className="size-7 flex items-center justify-center text-muted-foreground [&>svg]:size-3.5!">
            {renderSortIcon()}
          </div>
        )}
      </div>
    </div>
  );
}
