"use client";

import React, { useState, useId, ReactNode } from 'react';

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

const TabsContext = React.createContext<{
  id: string;
  activeTab: string;
  setActiveTab: (value: string) => void;
} | null>(null);

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const id = useId();

  return (
    <TabsContext.Provider value={{ id, activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div role="tablist" aria-orientation="horizontal" className={`flex min-w-0 gap-2 border-b border-line ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${context.id}-tab-${encodeURIComponent(value)}`}
      aria-controls={`${context.id}-panel-${encodeURIComponent(value)}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const list = event.currentTarget.closest('[role="tablist"]');
        if (!list) return;
        const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
          .filter((tab) => tab.closest('[role="tablist"]') === list && !tab.disabled);
        const current = tabs.indexOf(event.currentTarget);
        if (current < 0 || !tabs.length) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      }}
      onClick={() => context.setActiveTab(value)}
      className={`min-h-11 min-w-11 flex-1 whitespace-normal break-words px-2 py-2 text-sm font-medium border-b-2 transition-colors motion-reduce:transition-none ${
        isActive
          ? 'border-brand text-brand'
          : 'border-transparent text-ink-dim hover:text-brand'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const active = context.activeTab === value;
  return (
    <div
      role="tabpanel"
      id={`${context.id}-panel-${encodeURIComponent(value)}`}
      aria-labelledby={`${context.id}-tab-${encodeURIComponent(value)}`}
      tabIndex={0}
      hidden={!active}
      className={className}
    >
      {active ? children : null}
    </div>
  );
}
