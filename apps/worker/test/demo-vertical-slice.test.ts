import { describe, expect, it } from 'vitest';
import { DemoVerticalSlice } from '../src/demo-vertical-slice.js';

describe('required DemoAdapter vertical slice', () => {
  it('moves SEARCHING to NOTIFIED and emits exactly one notification across retries', async () => {
    const verticalSlice = new DemoVerticalSlice();
    await verticalSlice.run('state-1');
    expect(verticalSlice.snapshot()).toMatchObject({
      state: { status: 'SEARCHING', availability: 'NOT_AVAILABLE', occurrence: 0 },
      eventCount: 0,
      notificationCount: 0,
    });

    await verticalSlice.run('state-2');
    expect(verticalSlice.snapshot()).toMatchObject({
      state: { status: 'NOTIFIED', availability: 'AVAILABLE', occurrence: 1 },
      eventCount: 1,
      notificationCount: 1,
    });
    expect(verticalSlice.snapshot().message).toContain(
      'Tickets for Avatar: Fire and Ash appear to be available.',
    );

    await verticalSlice.run('state-2');
    await verticalSlice.run('state-2');
    expect(verticalSlice.snapshot()).toMatchObject({ eventCount: 1, notificationCount: 1 });
  });
});
