'use client';

import * as React from 'react';
import { BellRing } from 'lucide-react';
import { alertsOn, alertsSupported, turnOffAlerts, turnOnAlerts } from '@/lib/push';
import { toast } from '@/stores/toast-store';

type State = 'checking' | 'on' | 'off' | 'blocked' | 'unsupported';

/** On/off for new-release alerts on this device. */
export function ReleaseAlertsSetting() {
  const [state, setState] = React.useState<State>('checking');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!alertsSupported()) setState('unsupported');
    else if (Notification.permission === 'denied') setState('blocked');
    else alertsOn().then((on) => setState(on ? 'on' : 'off'));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === 'on') {
        await turnOffAlerts();
        setState('off');
      } else {
        const result = await turnOnAlerts();
        setState(result === 'on' ? 'on' : result);
      }
    } catch {
      toast.error("Couldn't change new-release alerts. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const on = state === 'on';
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="release-alerts" className="flex items-center gap-2 text-sm font-semibold text-white">
          <BellRing className="h-4 w-4 text-brand-400" />
          New-release alerts
        </label>
        <button
          id="release-alerts"
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy || state === 'checking' || state === 'blocked' || state === 'unsupported'}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-40 ${on ? 'bg-brand-500' : 'bg-neutral-800'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${on ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed">
        {state === 'blocked'
          ? 'Notifications are blocked for Musify. Allow them in your browser’s site settings, then come back here.'
          : state === 'unsupported'
            ? 'This browser can’t show notifications from Musify. On an iPhone, add Musify to your home screen first (Share → Add to Home Screen).'
            : 'A notification on this device when an artist you follow releases a new song. Follow artists from their page.'}
      </p>
    </div>
  );
}
