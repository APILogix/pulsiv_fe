import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface PulseButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
}

const PulseButton = React.forwardRef<HTMLButtonElement, PulseButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <Button
        className={cn(
          'transition-all duration-150 ease-out active:scale-[0.98]',
          // The base button from shadcn already has nice defaults, we just add our enterprise specific tweaks here
          variant === 'default' &&
            'bg-primary text-primary-foreground hover:bg-[#10b981] ring-1 ring-inset ring-white/10 shadow-sm',
          variant === 'outline' &&
            'border-border bg-transparent hover:bg-accent hover:text-foreground',
          variant === 'ghost' &&
            'hover:bg-accent hover:text-foreground',
          className
        )}
        variant={variant}
        size={size}
        disabled={isLoading || disabled}
        ref={ref}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Button>
    );
  }
);
PulseButton.displayName = 'PulseButton';

export { PulseButton };
