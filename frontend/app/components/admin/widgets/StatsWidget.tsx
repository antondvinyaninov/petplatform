import { ReactNode } from 'react';

interface StatsWidgetProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

export default function StatsWidget({ title, value, icon, trend, color = 'blue' }: StatsWidgetProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-3 font-medium">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mb-2 group-hover:scale-105 transition-transform duration-300">{value}</p>
          {trend && (
            <p className={`text-sm font-medium flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <span className="text-base">{trend.isPositive ? '↑' : '↓'}</span>
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClasses[color]} group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
