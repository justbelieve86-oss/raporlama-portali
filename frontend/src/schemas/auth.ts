import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, { message: 'Kullanıcı adı en az 3 karakter olmalı.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalı.' }),
});

export const createUserSchema = z.object({
  email: z.string().email({ message: 'Geçerli bir e-posta girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalı.' }),
  role: z.enum(['admin', 'user']),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;