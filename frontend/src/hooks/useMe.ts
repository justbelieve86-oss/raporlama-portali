import { useQuery } from '@tanstack/react-query';
import { getMe } from '../services/api';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });
}