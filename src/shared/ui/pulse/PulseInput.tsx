import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface PulseInputProps extends React.ComponentProps<typeof Input> {
  error?: string | boolean;
}

const PulseInput = React.forwardRef<HTMLInputElement, PulseInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <Input
          className={cn(
            'bg-card border-border text-foreground transition-all duration-150',
            'focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary',
            'hover:border-[#444444]',
            error && 'border-destructive focus-visible:ring-destructive focus-visible:border-destructive hover:border-destructive pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive pointer-events-none">
            <AlertCircle className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  }
);
PulseInput.displayName = 'PulseInput';

export { PulseInput };
