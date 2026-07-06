import { Timestamp } from "@/shared/observe";
import { Circle, GitCommitHorizontal, Key, Settings, User } from "lucide-react";

type ActivityEvent = {
  id: string;
  type: "deploy" | "config" | "member" | "key";
  title: string;
  description: string;
  timestamp: string;
  actor: string;
};

const MOCK_EVENTS: ActivityEvent[] = [
  { id: "1", type: "deploy", title: "Deployed v2.4.1", description: "Successfully rolled out api-gateway to production.", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), actor: "system" },
  { id: "2", type: "key", title: "API Key Created", description: "Created new production ingestion key.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), actor: "Alice" },
  { id: "3", type: "config", title: "Retention Updated", description: "Changed log retention from 14 to 30 days.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), actor: "Bob" },
  { id: "4", type: "member", title: "Member Added", description: "Added Charlie to the project as Viewer.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), actor: "Alice" },
];

const EventIcon = ({ type }: { type: ActivityEvent["type"] }) => {
  switch (type) {
    case "deploy": return <GitCommitHorizontal className="size-4 text-[var(--brand)]" />;
    case "config": return <Settings className="size-4 text-[var(--amber)]" />;
    case "member": return <User className="size-4 text-[var(--green)]" />;
    case "key": return <Key className="size-4 text-[var(--indigo)]" />;
    default: return <Circle className="size-4 text-[var(--text3)]" />;
  }
};

export function ActivityStream() {
  return (
    <div className="flex flex-col gap-6 p-4">
      {MOCK_EVENTS.map((event, i) => (
        <div key={event.id} className="relative flex gap-4">
          {i !== MOCK_EVENTS.length - 1 && (
            <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-[var(--border)]" />
          )}
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
            <EventIcon type={event.type} />
          </div>
          <div className="flex flex-col gap-1 pb-2">
            <div className="text-[14px] font-medium text-[var(--text)]">{event.title}</div>
            <div className="text-[13px] text-[var(--text2)]">{event.description}</div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--text3)]">
              <span>By {event.actor}</span>
              <span>•</span>
              <Timestamp value={new Date(event.timestamp).getTime()} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
