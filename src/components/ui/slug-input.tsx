import * as React from "react";
import { Input } from "./input";
import { cn } from "@/shared/utils/cn";

export interface SlugInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  baseValue?: string;
  onSlugChange?: (slug: string) => void;
}

export const generateSlug = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -

export const SlugInput = React.forwardRef<HTMLInputElement, SlugInputProps>(
  ({ className, baseValue, value, onChange, onSlugChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || "");

    React.useEffect(() => {
      if (baseValue !== undefined && !value) {
        const slug = generateSlug(baseValue);
        setInternalValue(slug);
        onSlugChange?.(slug);
      }
    }, [baseValue, value, onSlugChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      // Allow user to edit, but sanitize slightly
      val = val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      setInternalValue(val);
      onChange?.(e);
      onSlugChange?.(val);
    };

    return (
      <Input
        type="text"
        className={cn("font-mono text-sm", className)}
        value={value !== undefined ? value : internalValue}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  }
);
SlugInput.displayName = "SlugInput";
