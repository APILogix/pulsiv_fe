import * as React from "react";
import { cn } from "@/shared/utils/cn";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Smile } from "lucide-react";

// For simplicity in this demo, we'll just use a small list of emojis
const ICONS = ["🚀", "💡", "🔥", "✨", "📊", "🛠️", "⚙️", "📈", "🛡️", "🌐"];

export interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [selected, setSelected] = React.useState<string>(value || "");
  const [open, setOpen] = React.useState(false);

  const handleSelect = (icon: string) => {
    setSelected(icon);
    onChange?.(icon);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[60px] h-[60px] p-0 text-2xl flex items-center justify-center", className)}
        >
          {selected || <Smile className="w-6 h-6 text-muted-foreground" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px] p-2" align="start">
        <div className="grid grid-cols-5 gap-2">
          {ICONS.map((icon) => (
            <Button
              key={icon}
              variant="ghost"
              className="text-2xl p-0 h-10 w-10 flex items-center justify-center"
              onClick={() => handleSelect(icon)}
            >
              {icon}
            </Button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
