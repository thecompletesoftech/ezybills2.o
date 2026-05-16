'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, AlertCircle, Package, Warehouse } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ImportResult = { imported?: number; updated?: number; skipped: string[]; errors: string[] };

function CsvUploadCard({
  title, description, sampleEndpoint, importEndpoint, sampleFilename, resultKey,
}: {
  title: string; description: string; sampleEndpoint: string;
  importEndpoint: string; sampleFilename: string; resultKey: 'imported' | 'updated';
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData(); fd.append('file', f);
      return api.post(importEndpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: res => {
      setResult(res.data.data);
      toast.success('Import complete');
      setFile(null);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory-products'] });
    },
    onError: () => toast.error('Import failed'),
  });

  const downloadSample = () => {
    api.get(sampleEndpoint, { responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = sampleFilename; a.click(); URL.revokeObjectURL(url);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) setFile(f);
    else toast.error('Please upload a CSV file');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <Button variant="outline" size="sm" onClick={downloadSample}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Sample CSV
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </CardHeader>
      <CardContent>
        <div
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          {file ? (
            <div>
              <p className="font-medium text-gray-700">{file.name}</p>
              <p className="text-sm text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Drag & drop CSV or click to browse</p>
          )}
        </div>

        {file && (
          <div className="mt-3 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFile(null)}>Clear</Button>
            <Button variant="primary" loading={importMutation.isPending} onClick={() => importMutation.mutate(file)}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload & Import
            </Button>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-green-50 rounded-lg text-green-700 text-sm font-medium">
              ✓ {result[resultKey] ?? 0} records processed successfully
            </div>
            {result.skipped.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-amber-700 text-sm font-medium mb-1">Skipped ({result.skipped.length})</p>
                <div className="max-h-28 overflow-y-auto space-y-0.5">
                  {result.skipped.map((s, i) => <p key={i} className="text-xs text-amber-600">{s}</p>)}
                </div>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-red-700 text-sm font-medium mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Errors ({result.errors.length})
                </p>
                <div className="max-h-28 overflow-y-auto space-y-0.5">
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BulkImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
        <p className="text-sm text-gray-500 mt-0.5">Import products or restock inventory via CSV upload</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Package className="w-4 h-4" /> Product Import
          </div>
          <CsvUploadCard
            title="Import New Products"
            description="Add multiple products at once. Image URLs are automatically downloaded and compressed to 500×500. Duplicate SKUs are skipped with a report."
            sampleEndpoint="/products/import/sample"
            importEndpoint="/products/import"
            sampleFilename="product_import_sample.csv"
            resultKey="imported"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Warehouse className="w-4 h-4" /> Inventory Restock
          </div>
          <CsvUploadCard
            title="Bulk Stock Restock"
            description="Download the pre-filled template with your current products, fill in quantities and purchase prices, then upload. Stock movements are recorded with timestamp."
            sampleEndpoint="/stock/restock/sample"
            importEndpoint="/stock/restock"
            sampleFilename="stock_restock_template.csv"
            resultKey="updated"
          />
        </div>
      </div>

      {/* Tips */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Tips for a successful import</p>
          <ul className="space-y-1.5 text-sm text-gray-500 list-disc list-inside">
            <li>Download the sample CSV first — it shows the exact column format expected</li>
            <li>For product import: <strong>name</strong>, <strong>selling_price</strong> are required. All others optional</li>
            <li>If an <strong>image_url</strong> is provided, it must be a publicly accessible direct link to an image</li>
            <li>Duplicate SKUs in the product import are <strong>skipped</strong> (not updated) — edit existing products directly</li>
            <li>For restock: only rows with a positive <strong>quantity_to_add</strong> are processed</li>
            <li>Weighted average cost (WAC) is recalculated automatically if a purchase_price is provided</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
