import React from 'react';
import { QueryProvider } from './providers/QueryProvider';
import UserProfileDropdown from './UserProfileDropdown';

interface PageHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

function PageHeaderContent({ title, children }: PageHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 transition-colors duration-300" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        {/* Left side - Title and custom content */}
        <div className="flex items-center space-x-4">
          {title && (
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          )}
          {children}
        </div>
        
        {/* Right side - User Profile Dropdown */}
        <div className="flex items-center">
          <UserProfileDropdown />
        </div>
      </div>
    </header>
  );
}

export default function PageHeader(props: PageHeaderProps) {
  return (
    <QueryProvider>
      <PageHeaderContent {...props} />
    </QueryProvider>
  );
}