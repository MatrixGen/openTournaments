import * as z from 'zod';

export const tournamentSchema = z.object({
  name: z.string().min(5, 'Tournament name must be at least 5 characters').max(255),
  game_id: z.number().min(1, 'Please select a game'),
  platform_id: z.number().min(1, 'Please select a platform'),
  game_mode_id: z.number().min(1, 'Please select a game mode'),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin']),
  entry_fee: z.number().min(0, 'Entry fee must be at least 0'),
  total_slots: z.number().min(2, 'Minimum 2 slots required').max(128),
  start_time: z.string().refine(val => new Date(val) > new Date(), {
    message: 'Start time must be in the future',
  }),
  rules: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  prize_distribution: z.array(
    z.object({
      position: z.number().min(1),
      percentage: z.number().min(0).max(100),
    })
  ).refine(prizes => prizes.reduce((sum, p) => sum + p.percentage, 0) === 100, {
    message: 'Prize distribution must total 100%',
  }).optional(),
});
