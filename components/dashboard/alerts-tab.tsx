"use client"

import { useAlerts } from "@/hooks/use-alerts"
import { Bell, BellOff, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertBuilder } from "@/components/alert-builder"

export function AlertsTab() {
  const { alerts, toggle, remove } = useAlerts()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AlertBuilder />
      </div>
      {!alerts.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No alerts. Create one to get notified of new deals.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.sector ?? "Any sector"}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.stage && `${alert.stage} · `}
                  {alert.min_amount && `≥₹${alert.min_amount} Cr`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(alert.id, !alert.active)}>
                  {alert.active ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(alert.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
