'use client';

import { Truck } from 'lucide-react';

export default function SuppliersPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <Truck size={32} className="text-[#0066CC]" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">Suppliers</h2>
      <p className="text-gray-400 mt-2 text-sm">Supplier management coming soon.</p>
    </div>
  );
}
