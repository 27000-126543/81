import { useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  title: string | ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  rowKey?: keyof T | string;
  className?: string;
  emptyText?: string;
  showPagination?: boolean;
  rowClassName?: (row: T, index: number) => string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  rowKey = 'id' as keyof T,
  className = '',
  emptyText = '暂无数据',
  showPagination = true,
  rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const totalPages = Math.ceil(total / pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const renderCell = (row: T, column: Column<T>, index: number) => {
    if (column.render) {
      return column.render(row, index);
    }
    const key = column.key as keyof T;
    const value = row[key];
    return value as unknown as React.ReactNode;
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="overflow-x-auto rounded-xl border border-border-color">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-card">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`table-header ${column.className || ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-1">
                    {column.title}
                    {column.sortable && sortKey === column.key && (
                      <span className="text-cyan">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="table-cell text-center py-8">
                <div className="flex items-center justify-center gap-2 text-text-muted">
                  <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                  加载中...
                </div>
              </td>
            </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-cell text-center py-12 text-text-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
              <tr
                key={String(row[rowKey as keyof T] || index)}
                className={`table-row ${rowClassName ? rowClassName(row, index) : ''}`}
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className={`table-cell ${column.className || ''}`}>
                    {renderCell(row, column, index)}
                  </td>
                ))}
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && total > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-text-secondary">
            共 {total} 条记录，第 {page} / {totalPages} 页
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(1)}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 py-1 bg-bg-card rounded-lg text-sm">
              {page}
            </div>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => onPageChange?.(totalPages)}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
