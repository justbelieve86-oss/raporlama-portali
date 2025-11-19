import React from 'react';
import clsx from 'clsx';

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export interface FormProgressIndicatorProps {
  steps: Array<{ label: string; completed: boolean; current?: boolean }>;
  className?: string;
}

export function FormProgressIndicator({ steps, className }: FormProgressIndicatorProps) {
  return (
    <div className={clsx('w-full', className)}>
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-normal',
                  step.completed
                    ? 'bg-success-500 border-success-500 text-white'
                    : step.current
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                )}
              >
                {step.completed ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              
              {/* Step Label */}
              <p
                className={clsx(
                  'mt-2 text-xs font-medium text-center max-w-[100px]',
                  step.completed || step.current
                    ? 'text-gray-900'
                    : 'text-gray-500'
                )}
              >
                {step.label}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  'flex-1 h-0.5 mx-2 transition-all duration-normal',
                  step.completed ? 'bg-success-500' : 'bg-gray-300'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

