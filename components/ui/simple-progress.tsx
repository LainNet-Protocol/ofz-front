'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SimpleProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const SimpleProgress = React.forwardRef<HTMLDivElement, SimpleProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    // Ensure value is between 0 and 100
    const safeValue = Math.min(Math.max(0, value), 100);
    
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
          className
        )}
        {...props}
      >
        <div
          className="h-full w-full bg-primary transition-all"
          style={{ 
            transform: `translateX(-${100 - safeValue}%)` 
          }}
        />
      </div>
    );
  }
);

SimpleProgress.displayName = 'SimpleProgress';

export { SimpleProgress };
