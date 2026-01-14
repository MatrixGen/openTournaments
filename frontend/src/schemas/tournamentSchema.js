import * as z from 'zod';
import {
  getMinEntryFee,
  resolveTournamentCurrency,
  isWholeNumberCurrency,
} from '../utils/tournamentCurrency';

export const createTournamentSchema = (currencyCode) => {
  const resolvedCurrency = resolveTournamentCurrency(currencyCode);
  const minEntryFee = getMinEntryFee(resolvedCurrency);
  const integerOnly = isWholeNumberCurrency(resolvedCurrency);
  const formattedMin = minEntryFee.toLocaleString();

  return z.object({
    name: z.string().min(5, 'Tournament name must be at least 5 characters').max(255),
    game_id: z.number().min(1, 'Please select a game'),
    platform_id: z.number().min(1, 'Please select a platform'),
    game_mode_id: z.number().min(1, 'Please select a game mode'),
    format: z.enum(['single_elimination', 'double_elimination', 'round_robin'], {
      required_error: 'Please select a tournament format',
    }),
    currency: z.string().optional().default(resolvedCurrency),
    entry_fee: z
      .number()
      .min(minEntryFee, `Minimum entry fee is ${formattedMin} ${resolvedCurrency}`)
      .refine(
        (value) => !integerOnly || Number.isInteger(value),
        `Entry fee must be a whole number in ${resolvedCurrency}`
      ),
    total_slots: z.number().min(2, 'Minimum 2 slots required').max(128, 'Maximum 128 slots allowed'),
    start_time: z.string().min(1, 'Start time is required').refine(
      (val) => new Date(val) > new Date(), 
      'Start time must be in the future'
    ),
    rules: z.array(z.string().min(1, "Rule cannot be empty"))
      .min(1, "At least one rule is required")
      .max(20, "Maximum 20 rules allowed")
      .optional()
      .default([]),
    visibility: z.enum(['public', 'private']).default('public'),
    prize_pool: z
      .union([
        z.number().min(0, 'Prize pool cannot be negative'),
        z.literal(''),
      ])
      .optional()
      .refine(
        (value) => value === '' || value === undefined || !integerOnly || Number.isInteger(value),
        `Prize pool must be a whole number in ${resolvedCurrency}`
      ),
    prize_distribution: z.array(
      z.object({
        position: z.number().min(1, 'Position must be at least 1'),
        percentage: z.number().min(0, 'Percentage must be at least 0').max(100, 'Percentage cannot exceed 100'),
      })
    ).refine(
      (prizes) => prizes.reduce((sum, prize) => sum + prize.percentage, 0) === 100,
      'Prize distribution must total 100%'
    ).optional(),
    gamer_tag: z.string().min(2, 'Gamer tag must be at least 2 characters').max(50, 'Gamer tag cannot exceed 50 characters').optional(),
  });
};

export const tournamentSchema = createTournamentSchema();
