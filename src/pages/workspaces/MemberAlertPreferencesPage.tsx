import { useState } from "react";
import { useParams } from "react-router";
import { PageHeader, FillPage, Button } from "@/shared/observe";
import { Switch } from "@/components/ui/switch";
import { QuietHoursPicker, QuietHours } from "@/components/ui/quiet-hours-picker";
import { SeverityBadge, Severity } from "@/components/ui/severity-badge";
import { toast } from "sonner";

import { useAlertPreferences, useUpdateAlertPreference } from "@/modules/projects/hooks/useAlertPreferences";

export default function MemberAlertPreferencesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading } = useAlertPreferences(projectId!);
  
  // Local state for edits
  const [prefs, setPrefs] = useState<any[]>([]);

  // Initialize state once data loads
  if (data && prefs.length === 0 && !isLoading) {
    setPrefs(data.map((p: any) => ({
      ...p,
      quietHours: p.quietHours || { enabled: false, start: "22:00", end: "08:00", timezone: "UTC" }
    })));
  }

  const updateMutation = useUpdateAlertPreference(projectId!);

  const handleToggle = (id: string, isSubscribed: boolean) => {
    setPrefs(prefs.map((p: any) => p.id === id ? { ...p, isSubscribed } : p));
  };

  const handleSeverityChange = (id: string, minSeverity: string) => {
    setPrefs(prefs.map((p: any) => p.id === id ? { ...p, minSeverity } : p));
  };

  const handleQuietHoursChange = (id: string, quietHours: QuietHours) => {
    setPrefs(prefs.map((p: any) => p.id === id ? { ...p, quietHours } : p));
  };

  const handleSave = async () => {
    try {
      await Promise.all(
        prefs.map((pref) =>
          updateMutation.mutateAsync({
          routeId: pref.routeId,
          isSubscribed: pref.isSubscribed,
          minSeverity: pref.minSeverity,
          quietHours: pref.quietHours?.enabled ? pref.quietHours : null,
          })
        )
      );
      toast.success("Preferences updated successfully");
    } catch (e) {
      toast.error("Failed to update preferences");
    }
  };

  return (
    <FillPage>
      <PageHeader
        title="My Alert Preferences"
        description="Manage your notifications for this project's alert routes."
        actions={
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        }
      />

      <div className="mt-4 mb-2 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-md text-sm">
        <strong>Warning:</strong> Quiet hours are configured but not yet fully enforced by the server. Alerts may still be delivered during your scheduled quiet hours.
      </div>

      <div className="mt-6 space-y-6 max-w-4xl">
        {prefs.map(pref => (
          <div key={pref.id} className="bg-[var(--bg1)] rounded-[12px] border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{pref.routeName}</h3>
                <p className="text-sm text-muted-foreground">Receive notifications when this route is triggered.</p>
              </div>
              <Switch checked={pref.isSubscribed} onCheckedChange={(c) => handleToggle(pref.id, c)} />
            </div>

            {pref.isSubscribed && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-6">
                <div>
                  <div className="text-sm font-medium mb-2">Minimum Severity</div>
                  <div className="flex gap-2">
                    {(["info", "warning", "error", "critical"] as Severity[]).map(sev => (
                      <button
                        key={sev}
                        type="button"
                        className={`cursor-pointer rounded-full transition-all ${
                          pref.minSeverity === sev ? "ring-2 ring-primary ring-offset-2" : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                        }`}
                        aria-pressed={pref.minSeverity === sev}
                        aria-label={`Set minimum severity to ${sev}`}
                        onClick={() => handleSeverityChange(pref.id, sev)}
                      >
                        <SeverityBadge severity={sev} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <QuietHoursPicker 
                    value={pref.quietHours} 
                    onChange={(qh) => handleQuietHoursChange(pref.id, qh)} 
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {prefs.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-[var(--bg1)] rounded-[12px] border border-[var(--border)]">
            <p className="text-muted-foreground">No alert routes configured for this project yet.</p>
          </div>
        )}
      </div>
    </FillPage>
  );
}
