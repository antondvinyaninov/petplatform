import { ReactNode } from 'react';

interface TableWidgetProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function TableWidget({ title, children, actions }: TableWidgetProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 overflow-hidden w-full max-w-full">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
