import { PageHeader, SectionCard, Button, Field, SubmitButton, inputClass } from "@/shared/observe";
import { Mail, Plus, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function CreateReportPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");

  const addEmail = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (currentEmail && !emails.includes(currentEmail)) {
      setEmails([...emails, currentEmail]);
      setCurrentEmail("");
    }
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Scheduled report created successfully!");
    navigate("/dashboards/reports");
  };

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-2xl">
      <PageHeader 
        title="Create Scheduled Report" 
        description="Build a new customized email report to automatically send updates to your team."
      />

      <SectionCard title="Report Settings">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Report Name">
            <input type="text" required placeholder="e.g. Weekly Error & SLA Digest" className={inputClass} />
          </Field>

          <Field label="Frequency">
            <select aria-label="Frequency" className={inputClass}>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
              <option value="monthly">Monthly digest</option>
            </select>
          </Field>

          <div>
            <label htmlFor="report-recipient-email" className="text-[12px] font-semibold text-[var(--text2)] uppercase tracking-wider block mb-2">Recipients</label>
            <div className="flex gap-2">
              <input 
                id="report-recipient-email"
                type="email" 
                placeholder="colleague@company.com" 
                className={inputClass} 
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
              />
              <Button variant="secondary" type="button" onClick={() => addEmail()}><Plus className="size-4 mr-1" /> Add</Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {emails.map((email, idx) => (
                <div key={email} className="flex items-center gap-1.5 bg-[var(--bg3)] px-2.5 py-1 rounded-full text-xs text-[var(--text2)] border border-[var(--border)]">
                  <span>{email}</span>
                  <button type="button" aria-label={`Remove ${email}`} onClick={() => removeEmail(idx)} className="text-[var(--text3)] hover:text-[var(--text)]">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {emails.length === 0 && (
                <span className="text-xs text-[var(--text3)] italic">No recipients added yet.</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
            <Button variant="ghost" type="button" onClick={() => navigate("/dashboards/reports")}>Cancel</Button>
            <SubmitButton><Mail className="size-4 mr-2" /> Schedule report</SubmitButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
