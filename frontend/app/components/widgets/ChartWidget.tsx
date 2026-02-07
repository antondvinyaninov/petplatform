import { ReactNode } from 'react';

interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function ChartWidget({ title, subtitle, children }: ChartWidgetProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
