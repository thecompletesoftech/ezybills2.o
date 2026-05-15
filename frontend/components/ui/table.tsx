import { ReactNode, TdHTMLAttributes, ThHTMLAttributes, HTMLAttributes } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-sm text-left ${className}`}>{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-gray-50 text-gray-500 uppercase text-xs">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function TableRow({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { children?: ReactNode }) {
  return (
    <tr className={`hover:bg-gray-50 transition-colors ${className}`} {...props}>{children}</tr>
  );
}

export function TableHeader({
  children,
  className = '',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th
      className={`px-4 py-3 font-medium tracking-wider ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = '',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={`px-4 py-3 text-gray-700 ${className}`} {...props}>
      {children}
    </td>
  );
}
