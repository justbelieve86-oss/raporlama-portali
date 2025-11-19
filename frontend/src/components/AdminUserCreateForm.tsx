import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { createUserSchema, type CreateUserInput } from '../schemas/auth';
import { useCreateUser } from '../hooks/useCreateUser';

export default function AdminUserCreateForm() {
  const [form, setForm] = useState<CreateUserInput>({ email: '', password: '', role: 'user' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateUser();

  function handleChange<K extends keyof CreateUserInput>(key: K, value: CreateUserInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = createUserSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Validation error');
      return;
    }
    try {
      await mutation.mutateAsync(form);
      setForm({ email: '', password: '', role: 'user' });
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      setError(error?.response?.data?.message ?? error?.message ?? 'Hata oluştu');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">E-posta</label>
          <Input type="email" autoComplete="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Şifre</label>
          <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Rol</label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            value={form.role}
            onChange={(e) => handleChange('role', e.target.value as CreateUserInput['role'])}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button type="submit" variant="primary" disabled={mutation.isPending}>
        {mutation.isPending ? 'Ekleniyor...' : 'Yeni Kullanıcı Ekle'}
      </Button>
    </form>
  );
}