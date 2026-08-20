import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TablePaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({ page, pageCount, total, onPageChange }: TablePaginationProps) {
  if (pageCount <= 1) {
    return <p className="px-1 py-2 text-xs text-muted-foreground">{total} records</p>;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount} · {total} records
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" /> Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
