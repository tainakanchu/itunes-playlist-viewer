import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

import type { DiscoveredService } from './ExpoCrateforgeMdns.types';

export type { DiscoveredService } from './ExpoCrateforgeMdns.types';

/**
 * Default mDNS service type advertised by the Crateforge server (`src-tauri/src/mdns.rs`).
 * Note the trailing dot — this is the form `NsdManager` (Android) and `NetService` (iOS)
 * expect for the service type.
 */
export const DEFAULT_SERVICE_TYPE = '_crateforge._tcp.';

/**
 * A handle returned by {@link addServiceFoundListener} / {@link addServiceLostListener}.
 * Call {@link Subscription.remove} to stop receiving events.
 */
export type Subscription = {
  remove: () => void;
};

type CrateforgeMdnsEvents = {
  onServiceFound: (service: DiscoveredService) => void;
  onServiceLost: (payload: { name: string }) => void;
};

type ExpoCrateforgeMdnsNativeModule = {
  startDiscovery(serviceType: string): void;
  stopDiscovery(): void;
  addListener<EventName extends keyof CrateforgeMdnsEvents>(
    eventName: EventName,
    listener: CrateforgeMdnsEvents[EventName]
  ): EventSubscription;
};

/**
 * The native module, or `null` when it is unavailable.
 *
 * `requireOptionalNativeModule` returns `null` (instead of throwing) when the native
 * code is not present — e.g. when running in Expo Go, on web, or in a dev build that
 * was created before this module was added. Every exported function degrades to a
 * safe no-op / empty subscription in that case so callers can keep relying on manual
 * IP entry (and, on mobile, the QR flow) without crashing.
 */
const NativeModule = requireOptionalNativeModule<ExpoCrateforgeMdnsNativeModule>('ExpoCrateforgeMdns');

const NOOP_SUBSCRIPTION: Subscription = { remove: () => {} };

/**
 * Whether the native mDNS module is available in the current runtime.
 * When `false`, discovery is a no-op and listeners never fire.
 */
export function isAvailable(): boolean {
  return NativeModule != null;
}

/**
 * Start browsing the local network for Crateforge servers.
 *
 * Safe to call when the native module is unavailable (no-op). Calling it again
 * restarts discovery on the native side. Listen for results with
 * {@link addServiceFoundListener}.
 */
export function startDiscovery(serviceType: string = DEFAULT_SERVICE_TYPE): void {
  if (!NativeModule) {
    return;
  }
  try {
    NativeModule.startDiscovery(serviceType);
  } catch {
    // best-effort: never let a discovery failure bubble up to the UI.
  }
}

/**
 * Stop browsing the local network. Safe to call multiple times / when unavailable.
 */
export function stopDiscovery(): void {
  if (!NativeModule) {
    return;
  }
  try {
    NativeModule.stopDiscovery();
  } catch {
    // best-effort
  }
}

/**
 * Subscribe to discovered (resolved) Crateforge servers. The listener receives a
 * {@link DiscoveredService} with an already-resolved IP `host` and `port`.
 *
 * Returns a {@link Subscription}; call `remove()` to unsubscribe. When the native
 * module is unavailable this returns an inert subscription that never fires.
 */
export function addServiceFoundListener(
  listener: (service: DiscoveredService) => void
): Subscription {
  if (!NativeModule) {
    return { ...NOOP_SUBSCRIPTION };
  }
  try {
    const subscription = NativeModule.addListener('onServiceFound', listener);
    return {
      remove: () => {
        try {
          subscription.remove();
        } catch {
          // best-effort
        }
      },
    };
  } catch {
    return { ...NOOP_SUBSCRIPTION };
  }
}

/**
 * Subscribe to servers that disappear from the network. The listener receives the
 * mDNS instance `name` that was lost. Same fallback semantics as
 * {@link addServiceFoundListener}.
 */
export function addServiceLostListener(
  listener: (payload: { name: string }) => void
): Subscription {
  if (!NativeModule) {
    return { ...NOOP_SUBSCRIPTION };
  }
  try {
    const subscription = NativeModule.addListener('onServiceLost', listener);
    return {
      remove: () => {
        try {
          subscription.remove();
        } catch {
          // best-effort
        }
      },
    };
  } catch {
    return { ...NOOP_SUBSCRIPTION };
  }
}
