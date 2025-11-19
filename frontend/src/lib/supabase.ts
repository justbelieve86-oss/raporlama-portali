import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Ortam değişkenlerini güvenli şekilde oku (import.meta.env yoksa process.env'e düş)
const supabaseUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process.env as any)?.PUBLIC_SUPABASE_URL) ||
  '';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && (process.env as any)?.PUBLIC_SUPABASE_ANON_KEY) ||
  '';

// Prod ortamında Supabase env eksikse fail-fast
const isProd =
  (typeof import.meta !== 'undefined' && !!(import.meta as any).env?.PROD) ||
  (typeof process !== 'undefined' && (process.env as any)?.NODE_ENV === 'production');

if (isProd && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Supabase konfigürasyonu eksik (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY). Production’da env’leri zorunlu olarak sağlayın.');
}

let supabaseClient: SupabaseClient | any;

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Eksik konfigürasyonda import anında patlamayı önlemek için minimal stub
  supabaseClient = {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async getUser() {
        // Stub: Supabase konfigürasyonu yoksa kullanıcı bilgisi yok
        return { data: { user: null }, error: null } as any;
      },
      async setSession(_tokens: { access_token: string; refresh_token: string }) {
        // Stub: Supabase konfigürasyonu yoksa session kurulamıyor
        return { data: { session: null }, error: new Error('Supabase konfigürasyonu eksik: PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY') };
      },
      async signInWithPassword() {
        return { 
          data: null, 
          error: new Error('Supabase konfigürasyonu eksik: PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY') 
        };
      },
      async signOut() {
        // Stub: Çıkış işlemi yok ama hata da verme
        return { error: null } as any;
      },
      onAuthStateChange() {
        // Minimal event subscription stub
        return { data: { subscription: { unsubscribe: () => {} } } } as any;
      }
    },
    from() {
      return {
        select: () => ({ data: [], error: new Error('Supabase konfigürasyonu eksik') }),
        insert: () => ({ data: null, error: new Error('Supabase konfigürasyonu eksik') }),
        update: () => ({ data: null, error: new Error('Supabase konfigürasyonu eksik') }),
        delete: () => ({ data: null, error: new Error('Supabase konfigürasyonu eksik') }),
      };
    },
  } as any;
}

// Hem named export hem default export sağla (geriye uyumluluk için)
export const supabase = supabaseClient;
export default supabaseClient;