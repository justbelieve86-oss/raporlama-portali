# 📝 Form UX Component'leri Kullanım Kılavuzu

Bu doküman, Form UX iyileştirmeleri için oluşturulan component'lerin nasıl kullanılacağını açıklar.

## 🎯 Oluşturulan Component'ler

### 1. FloatingLabelInput

Modern floating label input component'i. Label, input focus olduğunda veya değer girildiğinde yukarı kayar.

#### Kullanım

```tsx
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';

<FloatingLabelInput
  label="Kullanıcı Adı"
  type="text"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  error={errors.username}
  helperText="Örn: ayilmaz"
  showValidationIcon={!!username}
  required
/>
```

#### Props

- `label: string` - Input label'ı (zorunlu)
- `error?: string` - Hata mesajı
- `helperText?: string` - Yardımcı metin (placeholder yerine)
- `showValidationIcon?: boolean` - Validation icon göster (default: false)
- `required?: boolean` - Zorunlu alan göstergesi
- Diğer tüm standard HTML input props'ları desteklenir

#### Özellikler

- ✅ Floating label animasyonu
- ✅ Real-time validation icon'ları (✓/✗)
- ✅ Error mesajları
- ✅ Helper text desteği
- ✅ Design system renkleri kullanır

---

### 2. PasswordStrengthIndicator

Şifre gücünü görsel olarak gösteren component.

#### Kullanım

```tsx
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';

<PasswordStrengthIndicator password={password} />
```

#### Props

- `password: string` - Kontrol edilecek şifre
- `className?: string` - Ek CSS class'ları

#### Özellikler

- ✅ 4 seviyeli güç göstergesi (çok zayıf, zayıf, orta, güçlü)
- ✅ Renk kodlu progress bar'lar
- ✅ Şifre gereksinimleri listesi
- ✅ Real-time güncelleme

#### Şifre Gücü Hesaplama

- Uzunluk kontrolü (8+ karakter: +1, 12+ karakter: +1)
- Küçük harf: +1
- Büyük harf: +1
- Rakam: +1
- Özel karakter: +1

Maksimum: 4 (Güçlü)

---

### 3. AutoSaveIndicator

Auto-save durumunu gösteren indicator component'i.

#### Kullanım

```tsx
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';

const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

<AutoSaveIndicator 
  status={saveStatus} 
  message={saveStatus === 'saved' ? 'Değişiklikler kaydedildi' : undefined}
/>
```

#### Props

- `status: 'idle' | 'saving' | 'saved' | 'error'` - Durum (zorunlu)
- `message?: string` - Özel mesaj (opsiyonel)
- `className?: string` - Ek CSS class'ları

#### Durumlar

- `idle`: Gösterilmez
- `saving`: "Kaydediliyor..." (spinner icon)
- `saved`: "Kaydedildi" (checkmark icon, 3 saniye sonra kaybolur)
- `error`: "Kaydetme hatası" (error icon)

#### Auto-save Örneği

```tsx
import { useState, useEffect, useCallback } from 'react';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';

function MyForm() {
  const [formData, setFormData] = useState({ name: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    const timeout = setTimeout(async () => {
      if (formData.name) {
        setSaveStatus('saving');
        try {
          await saveFormData(formData);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
          setSaveStatus('error');
        }
      }
    }, 1000); // 1 saniye debounce

    setSaveTimeout(timeout);
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [formData]);

  return (
    <div>
      <input 
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <AutoSaveIndicator status={saveStatus} />
    </div>
  );
}
```

---

### 4. FormProgressIndicator

Multi-step form'larda ilerlemeyi gösteren component.

#### Kullanım

```tsx
import { FormProgressIndicator } from '@/components/ui/FormProgressIndicator';

const steps = [
  { label: 'Kişisel Bilgiler', completed: true, current: false },
  { label: 'İletişim', completed: false, current: true },
  { label: 'Onay', completed: false, current: false },
];

<FormProgressIndicator steps={steps} />
```

#### Props

- `steps: Array<{ label: string; completed: boolean; current?: boolean }>` - Adımlar (zorunlu)
- `className?: string` - Ek CSS class'ları

#### Özellikler

- ✅ Step numaraları veya checkmark icon'ları
- ✅ Tamamlanan adımlar için yeşil renk
- ✅ Mevcut adım için mavi renk
- ✅ Adımlar arası connector line'lar
- ✅ Responsive tasarım

---

## 🎨 Tüm Component'leri Birlikte Kullanım Örneği

```tsx
import React, { useState } from 'react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';
import { FormProgressIndicator } from '@/components/ui/FormProgressIndicator';

function CompleteFormExample() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const steps = [
    { label: 'Kişisel Bilgiler', completed: step > 1, current: step === 1 },
    { label: 'Güvenlik', completed: step > 2, current: step === 2 },
    { label: 'Onay', completed: step > 3, current: step === 3 },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Progress Indicator */}
      <FormProgressIndicator steps={steps} />

      {/* Auto-save Indicator */}
      <div className="flex justify-end">
        <AutoSaveIndicator status={saveStatus} />
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <FloatingLabelInput
          label="Ad"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          error={errors.firstName}
          showValidationIcon={!!formData.firstName}
          required
        />

        <FloatingLabelInput
          label="Soyad"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          error={errors.lastName}
          showValidationIcon={!!formData.lastName}
          required
        />

        <FloatingLabelInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          helperText="ornek@email.com"
          showValidationIcon={!!formData.email}
          required
        />

        <div>
          <FloatingLabelInput
            label="Şifre"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            showValidationIcon={!!formData.password && !errors.password}
            required
          />
          {formData.password && (
            <PasswordStrengthIndicator password={formData.password} />
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ Best Practices

### 1. FloatingLabelInput
- ✅ `showValidationIcon` prop'unu sadece değer girildiğinde aktif edin
- ✅ `helperText` kullanarak kullanıcıya örnek verin
- ✅ `error` prop'unu validation sonrası set edin
- ❌ Placeholder kullanmayın (floating label zaten var)

### 2. PasswordStrengthIndicator
- ✅ Sadece şifre girildiğinde gösterin
- ✅ Şifre değiştiğinde otomatik güncellenir
- ✅ Form submit'ten önce güçlü şifre kontrolü yapın

### 3. AutoSaveIndicator
- ✅ Debounce kullanın (1-2 saniye)
- ✅ `saved` durumunda 3 saniye sonra `idle`'a dönün
- ✅ Error durumunda kullanıcıya retry seçeneği sunun

### 4. FormProgressIndicator
- ✅ Her adım için `completed` ve `current` durumlarını doğru set edin
- ✅ Sadece bir adım `current: true` olmalı
- ✅ Tamamlanan adımlar için `completed: true` set edin

---

## 📚 Referanslar

- Design System: `frontend/src/lib/DESIGN_SYSTEM.md`
- Design Tokens: `frontend/src/lib/designTokens.ts`
- Component'ler: `frontend/src/components/ui/`

