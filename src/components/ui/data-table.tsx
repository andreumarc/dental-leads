"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState as TanStackPaginationState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./skeleton";

interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  data: TData[];
  loading?: boolean;
  pagination?: DataTablePagination;
  onPaginationChange?: (page: number, pageSize: number) => void;
  globalFilter?: string;
  onFilterChange?: (value: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  striped?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  pagination,
  onPaginationChange,
  globalFilter,
  onFilterChange,
  emptyTitle = "No hay datos",
  emptyDescription = "No se encontraron registros con los filtros actuales.",
  className,
  striped = true,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: globalFilter ?? "",
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: onFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: !!pagination,
    pageCount: pagination?.totalPages ?? -1,
  });

  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const total = pagination?.total ?? data.length;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className={cn("bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden", className)}>
      {/* Table wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="bg-neutral-50 border-b border-neutral-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        "px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap",
                        canSort && "cursor-pointer select-none hover:text-neutral-700 transition-colors"
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {canSort && (
                          <span className="text-neutral-300">
                            {sortDir === "asc" ? (
                              <ChevronUp className="w-3 h-3 text-[#0D9488]" />
                            ) : sortDir === "desc" ? (
                              <ChevronDown className="w-3 h-3 text-[#0D9488]" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} />
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16">
                  <div className="flex flex-col items-center justify-center text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                      <Inbox className="w-5 h-5 text-neutral-400" />
                    </div>
                    <p className="text-sm font-semibold text-neutral-700 mb-1">
                      {emptyTitle}
                    </p>
                    <p className="text-xs text-neutral-400 max-w-xs">
                      {emptyDescription}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors duration-100 table-row-hover",
                    striped && rowIndex % 2 !== 0 ? "bg-neutral-50/50" : "bg-white"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-neutral-700 whitespace-nowrap"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
          <p className="text-xs text-neutral-500">
            {loading ? (
              <span className="animate-pulse">Cargando…</span>
            ) : total === 0 ? (
              "Sin resultados"
            ) : (
              <>
                Mostrando{" "}
                <span className="font-medium text-neutral-700">
                  {startItem}–{endItem}
                </span>{" "}
                de{" "}
                <span className="font-medium text-neutral-700">
                  {new Intl.NumberFormat("es-ES").format(total)}
                </span>{" "}
                registros
              </>
            )}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                onPaginationChange?.(currentPage - 1, pageSize)
              }
              disabled={currentPage <= 1 || loading}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                currentPage <= 1 || loading
                  ? "border-neutral-200 text-neutral-300 cursor-not-allowed bg-white"
                  : "border-neutral-200 text-neutral-600 hover:bg-white hover:border-neutral-300 bg-white cursor-pointer"
              )}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>

            {/* Page numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPaginationChange?.(pageNum, pageSize)}
                    disabled={loading}
                    className={cn(
                      "w-8 h-7 rounded-lg text-xs font-medium border transition-colors",
                      pageNum === currentPage
                        ? "bg-[#0D9488] border-[#0D9488] text-white shadow-sm"
                        : "border-neutral-200 text-neutral-600 hover:bg-white hover:border-neutral-300 bg-white"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                onPaginationChange?.(currentPage + 1, pageSize)
              }
              disabled={currentPage >= totalPages || loading}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                currentPage >= totalPages || loading
                  ? "border-neutral-200 text-neutral-300 cursor-not-allowed bg-white"
                  : "border-neutral-200 text-neutral-600 hover:bg-white hover:border-neutral-300 bg-white cursor-pointer"
              )}
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
