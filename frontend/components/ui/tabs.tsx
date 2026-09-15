import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center space-x-2 border-b border-neutral-800 pb-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
            activeTab === tab.id
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
