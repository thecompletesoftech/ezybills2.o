'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import type { Product, PaginatedResponse } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

export default function InventoryPage() {
  const { data, isLoading } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get('/reports/inventory');
      return res.data;
    },
  });

  const products = data?.data ?? [];
  const lowStockProducts = products.filter((p) => p.stock_quantity <= p.low_stock_threshold);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Inventory</h2>
        <p className="text-gray-500 text-sm mt-0.5">Stock levels across all products</p>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">{lowStockProducts.length} item(s) are low on stock</p>
            <p className="text-xs text-red-500 mt-0.5">
              {lowStockProducts.map((p) => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Products — Stock Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No inventory data.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Product</TableHeader>
                  <TableHeader>SKU</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Stock</TableHeader>
                  <TableHeader>Threshold</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => {
                  const isLow = product.stock_quantity <= product.low_stock_threshold;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-gray-400">{product.sku ?? '—'}</TableCell>
                      <TableCell>{product.category?.name ?? '—'}</TableCell>
                      <TableCell>
                        <span className={isLow ? 'text-red-600 font-bold' : 'text-gray-700'}>
                          {product.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell>{product.low_stock_threshold}</TableCell>
                      <TableCell>
                        <Badge variant={isLow ? 'red' : 'green'}>
                          {isLow ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
