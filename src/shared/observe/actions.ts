import { toast } from "sonner";

// Demo-mode action feedback. Every wired button routes through here or navigates.
export function demoAction(label: string) {
  toast.info(label, { description: "Not implemented in demo." });
}

export function demoSuccess(label: string) {
  toast.success(label);
}
