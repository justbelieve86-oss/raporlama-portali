import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export interface RowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface RowActionsMenuProps {
  actions: RowAction[];
  trigger?: React.ReactNode;
  className?: string;
}

/**
 * Row Actions Menu Component
 * Three-dot menu for table rows
 */
export function RowActionsMenu({
  actions,
  trigger,
  className,
}: RowActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const defaultTrigger = (
    <button
      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label="İşlemler"
    >
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    </button>
  );

  return (
    <div className={clsx('relative', className)} ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger || defaultTrigger}
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-1 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (!action.disabled) {
                      action.onClick();
                      setIsOpen(false);
                    }
                  }}
                  disabled={action.disabled}
                  className={clsx(
                    'w-full px-4 py-2 text-left text-sm transition-colors',
                    'flex items-center gap-2',
                    'hover:bg-gray-50',
                    action.disabled && 'opacity-50 cursor-not-allowed',
                    action.variant === 'danger' && 'text-error-600 hover:bg-error-50',
                    !action.variant && 'text-gray-700'
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


