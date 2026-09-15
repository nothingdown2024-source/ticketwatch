import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { PrismaClient } from '@ticketwatch/database';
import { hash, verify } from 'argon2';
import type { AuthenticatedUser } from './auth.types.js';
import type { LoginDto, RegisterDto } from './dto.js';
import { PRISMA } from '../tokens.js';

export interface CreatedSession {
  token: string;
  user: AuthenticatedUser;
  expiresAt: Date;
}

const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  public constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  public async register(input: RegisterDto): Promise<CreatedSession> {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException('An account already exists for this email.');
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hash(input.password, { type: 2 }),
        profile: { create: { displayName: input.displayName.trim() } },
        notificationPreferences: { create: { channel: 'CONSOLE', enabled: true } },
      },
      include: { profile: true },
    });
    return this.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.profile?.displayName ?? input.displayName,
    });
  }

  public async login(input: LoginDto): Promise<CreatedSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      include: { profile: true },
    });
    if (
      user === null ||
      user.deletedAt !== null ||
      !(await verify(user.passwordHash, input.password))
    ) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }
    return this.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.profile?.displayName ?? user.email,
    });
  }

  public async authenticate(token: string | undefined): Promise<AuthenticatedUser | null> {
    if (token === undefined || token.length < 32) return null;
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: { include: { profile: true } } },
    });
    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date() ||
      session.user.deletedAt !== null
    )
      return null;
    return {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      displayName: session.user.profile?.displayName ?? session.user.email,
    };
  }

  public async logout(token: string | undefined): Promise<void> {
    if (token === undefined) return;
    await this.prisma.authSession.updateMany({
      where: { tokenHash: tokenHash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async createSession(user: AuthenticatedUser): Promise<CreatedSession> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 86_400_000);
    await this.prisma.authSession.create({
      data: { userId: user.id, tokenHash: tokenHash(token), expiresAt },
    });
    return { token, user, expiresAt };
  }
}
