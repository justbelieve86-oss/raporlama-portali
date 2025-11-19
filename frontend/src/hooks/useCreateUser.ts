import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCreateUser } from '../services/api';

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminCreateUser,
    onSuccess: () => {
      // Kullanıcıların listesi eklenirse invalidation yapılabilir
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}