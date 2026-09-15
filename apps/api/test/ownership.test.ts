import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertOwner } from '../src/alerts/ownership.js';

describe('alert ownership policy', () => {
  it('allows the owner', () => expect(() => assertOwner('user-a', 'user-a')).not.toThrow());
  it('denies cross-user access even with a valid opaque ID', () => {
    expect(() => assertOwner('user-a', 'user-b')).toThrow(ForbiddenException);
  });
});
