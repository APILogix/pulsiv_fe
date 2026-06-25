import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data
const notifications = [
  { id: 1, title: 'High CPU Usage', time: '10m ago', unread: true },
  { id: 2, title: 'Deployment Successful', time: '1h ago', unread: false },
  { id: 3, title: 'New Team Member', time: '2h ago', unread: false },
];

export function NotificationCenter() {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px] bg-popover border-border text-popover-foreground">
        <DropdownMenuLabel className="font-mono text-xs text-muted-foreground flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && <span className="text-primary cursor-pointer hover:underline">Mark all read</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        {notifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-accent"
          >
            <div className="flex w-full justify-between items-center gap-2">
              <span className={`text-sm ${notification.unread ? 'text-foreground font-medium' : 'text-popover-foreground'}`}>
                {notification.title}
              </span>
              {notification.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
            </div>
            <span className="text-xs text-muted-foreground">{notification.time}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
