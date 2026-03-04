import { z } from 'zod';

export const lobbyCreateSchema = z.object({
  name: z.string().min(2).max(24),
  tiePolicy: z.enum(['no-lynch', 'revote', 'coinflip']).optional(),
  roles: z.array(z.string()).min(4).max(12).optional(),
});

export const actionSchema = z.object({
  type: z.string().min(2).max(32),
  targetId: z.string().optional(),
});

export const voteSchema = z.object({
  targetId: z.string().nullable(),
});
