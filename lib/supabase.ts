import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const isBrowser = typeof window !== 'undefined';

const cookieStorage = {
  getItem(key: string) {
    if (!isBrowser) return null;
    const name = `${encodeURIComponent(key)}=`;
    const cookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith(name));
    return cookie ? decodeURIComponent(cookie.slice(name.length)) : null;
  },
  setItem(key: string, value: string) {
    if (!isBrowser) return;
    const secureFlag = window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? '; secure' : '';
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; sameSite=lax${secureFlag}`;
  },
  removeItem(key: string) {
    if (!isBrowser) return;
    const secureFlag = window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? '; secure' : '';
    document.cookie = `${encodeURIComponent(key)}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; sameSite=lax${secureFlag}`;
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage: cookieStorage,
  },
});