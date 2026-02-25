"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { ChevronLeft, ChevronRight, Eye, Search, X } from "lucide-react";

export function DataTable({
  columns,
  data = [],
  searchKey,
  getSearchValue,
  searchPlaceholder = "Search",
  hideSearchInput = false,
  enableColumnVisibility = false,
  toolbarContent = null,
  showSearchClear = false,
  onClearFilters,
  filtersActive = false,
  clearFiltersLabel = "Clear filters",
  emptyMessage = "No results.",
  enableExpanding = false,
  getRowCanExpand = () => false,
  renderSubRow = null,
}) {
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalSearch, setGlobalSearch] = React.useState("");

  const globalFilterFn = React.useMemo(() => {
    if (!getSearchValue) {
      return undefined;
    }

    return (row, _columnId, filterValue) => {
      if (!filterValue) {
        return true;
      }

      const haystack = (getSearchValue(row.original, row) ?? "")
        .toString()
        .toLowerCase();
      return haystack.includes(String(filterValue).toLowerCase());
    };
  }, [getSearchValue]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    ...(enableExpanding && {
      getExpandedRowModel: getExpandedRowModel(),
      getRowCanExpand,
    }),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: getSearchValue ? globalSearch : undefined,
    },
  });

  const totalPages = Math.max(table.getPageCount(), 1);
  const currentPage = Math.min(
    (table.getState().pagination?.pageIndex ?? 0) + 1,
    totalPages
  );
  const pageSize = table.getState().pagination?.pageSize ?? 10;
  const pageIndex = table.getState().pagination?.pageIndex ?? 0;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageRowsCount = table.getRowModel().rows.length;
  const pageStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd =
    totalRows === 0 ? 0 : pageStart + Math.max(pageRowsCount - 1, 0);

  const searchable = Boolean((getSearchValue || searchKey) && !hideSearchInput);
  const searchColumn =
    !getSearchValue && searchKey && searchable
      ? table.getColumn(searchKey)
      : null;
  const searchValue = getSearchValue
    ? globalSearch
    : searchColumn?.getFilterValue() ?? "";
  const hasSearchValue =
    typeof searchValue === "string"
      ? searchValue.trim().length > 0
      : searchValue !== null && searchValue !== undefined;

  const handleSearchChange = (value) => {
    if (getSearchValue) {
      setGlobalSearch(value);
    } else {
      searchColumn?.setFilterValue(value);
    }
    table.resetPageIndex();
  };

  const handleSearchClear = () => {
    if (getSearchValue) {
      setGlobalSearch("");
    } else {
      searchColumn?.setFilterValue("");
    }
    table.resetPageIndex();
    onClearFilters?.();
  };

  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());
  const canToggleAll = hideableColumns.length > 0;

  const toggleAllColumns = () => {
    if (!canToggleAll) {
      return;
    }

    const shouldHide = hideableColumns.every((column) => column.getIsVisible());
    hideableColumns.forEach((column) => column.toggleVisibility(!shouldHide));
  };

  return (
    <div className="flex flex-col gap-4">
      {(searchable || enableColumnVisibility || toolbarContent) && (
        <div className="w-full flex flex-col md:flex-row items-center gap-3">
          {searchable ? (
            <div className="flex-1 w-full flex items-center gap-2">
              <div className="flex-1 relative w-full">
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  className="max-w-xl pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              </div>
              {showSearchClear && (hasSearchValue || filtersActive) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleSearchClear}
                      disabled={!hasSearchValue && !filtersActive}
                    >
                      <X />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{clearFiltersLabel}</TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : null}
          <div className="w-full md:w-fit flex flex-wrap justify-end gap-2 [&>button]:flex-1 md:[&>button]:w-fit">
            {toolbarContent}
            {enableColumnVisibility ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="flex items-center justify-between py-0">
                    <span>Toggle columns</span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleAllColumns();
                      }}
                      disabled={!canToggleAll}
                      className="size-7 [&>svg]:size-4!"
                    >
                      <Eye />
                    </Button>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table.getAllLeafColumns().map((column) => {
                    if (!column.getCanHide()) {
                      return null;
                    }

                    const title = column.columnDef.meta?.title ?? column.id;

                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(Boolean(value))
                        }
                      >
                        {title}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      )}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {enableExpanding && row.getIsExpanded() && renderSubRow && renderSubRow(row)}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col-reverse gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex flex-row-reverse md:flex-row items-center justify-between gap-3">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8!">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            {totalRows === 0
              ? "No rows to display."
              : `Showing ${pageStart} - ${pageEnd} of ${totalRows} rows`}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
