import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tournamentSchema } from '../schemas/tournamentSchema';

export function useTournamentForm(defaultValues) {
  const methods = useForm({
    resolver: zodResolver(tournamentSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: 'prize_distribution',
  });

  return { ...methods, fields, append, remove };
}
