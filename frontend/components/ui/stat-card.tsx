import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    up: boolean;
  };
  colorClass?: string;
}

export function StatCard({ label, value, icon, trend, colorClass = 'bg-blue-50 text-[#0066CC]' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`flex-shrink-0 rounded-xl p-3 ${colorClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
