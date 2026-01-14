import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTournamentSchema } from '../schemas/tournamentSchema';
import { resolveTournamentCurrency } from '../utils/tournamentCurrency';

export function useTournamentForm(defaultValues, currencyCode) {
  const formCurrency = resolveTournamentCurrency(currencyCode);
  const methods = useForm({
    resolver: zodResolver(createTournamentSchema(formCurrency)),
    defaultValues: {
      currency: formCurrency,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: 'prize_distribution',
  });

  return { ...methods, fields, append, remove };
}
