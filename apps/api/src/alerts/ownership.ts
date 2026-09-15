import { ForbiddenException } from '@nestjs/common';

export function assertOwner(ownerId: string, actorId: string): void {
  if (ownerId !== actorId) throw new ForbiddenException('You do not have access to this alert.');
}
