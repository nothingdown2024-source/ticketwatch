import type { AvailabilityStatus, WatchStatus } from './types.js';

export interface WatchStateValue {
  status: WatchStatus;
  availability: AvailabilityStatus;
  occurrence: number;
}

export type WatchObservation =
  | { kind: 'SCAN_FAILED'; errorCode: string }
  | { kind: 'MATCHED' }
  | { kind: 'NOT_MATCHED' }
  | { kind: 'PAUSE' }
  | { kind: 'RESUME' }
  | { kind: 'NOTIFICATION_SENT' };

export interface WatchTransition {
  next: WatchStateValue;
  availabilityOpened: boolean;
  availabilityClosed: boolean;
  reason: string;
}

export function transitionWatch(
  current: WatchStateValue,
  observation: WatchObservation,
): WatchTransition {
  if (current.status === 'DISABLED') {
    return {
      next: current,
      availabilityOpened: false,
      availabilityClosed: false,
      reason: 'disabled',
    };
  }
  if (observation.kind === 'PAUSE') {
    return {
      next: { ...current, status: 'PAUSED' },
      availabilityOpened: false,
      availabilityClosed: false,
      reason: 'paused',
    };
  }
  if (observation.kind === 'RESUME') {
    return {
      next: {
        ...current,
        status: current.availability === 'AVAILABLE' ? 'AVAILABLE' : 'SEARCHING',
      },
      availabilityOpened: false,
      availabilityClosed: false,
      reason: 'resumed',
    };
  }
  if (current.status === 'PAUSED') {
    return {
      next: current,
      availabilityOpened: false,
      availabilityClosed: false,
      reason: 'paused',
    };
  }
  if (observation.kind === 'SCAN_FAILED') {
    return {
      next: { ...current, status: 'ERROR' },
      availabilityOpened: false,
      availabilityClosed: false,
      reason: `scan-failed:${observation.errorCode}`,
    };
  }
  if (observation.kind === 'NOTIFICATION_SENT') {
    return {
      next: { ...current, status: 'NOTIFIED' },
      availabilityOpened: false,
      availabilityClosed: false,
      reason: 'notification-sent',
    };
  }
  if (observation.kind === 'MATCHED') {
    const opened = current.availability !== 'AVAILABLE';
    return {
      next: {
        status: opened ? 'AVAILABLE' : current.status === 'ERROR' ? 'AVAILABLE' : current.status,
        availability: 'AVAILABLE',
        occurrence: opened ? current.occurrence + 1 : current.occurrence,
      },
      availabilityOpened: opened,
      availabilityClosed: false,
      reason: opened ? 'availability-opened' : 'availability-unchanged',
    };
  }
  const closed = current.availability === 'AVAILABLE';
  return {
    next: {
      status: 'SEARCHING',
      availability: 'NOT_AVAILABLE',
      occurrence: current.occurrence,
    },
    availabilityOpened: false,
    availabilityClosed: closed,
    reason: closed ? 'availability-closed' : 'still-searching',
  };
}
