
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage('');

    if (!validateEmail(email)) {
      setError('Format email salah. Gunakan email yang valid.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    
    // Send OTP untuk verifikasi email
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    setLoading(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes('rate limit')) {
        setError('Terlalu banyak percobaan. Tunggu beberapa saat.');
      } else {
        setError('Gagal mengirim link verifikasi. Coba lagi nanti.');
      }
      return;
    }

    setMessage('Link verifikasi telah dikirim ke email kamu. Cek Gmail dan klik link untuk memverifikasi email.');
    setEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper">
      <div className="relative w-full max-w-sm">
        {/* Glassmorphism Floating Badge */}
        <div className="absolute -top-6 -right-4 z-10 rotate-[4deg] backdrop-blur-md bg-white/70 border border-white/40 shadow-sm px-4 py-2 rounded-full flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-maroon" />
          <span className="font-mono text-xs font-semibold text-dark tracking-wide uppercase">Area Anggota</span>
        </div>

        {/* Main Card */}
        <div className="bg-white border-2 border-dark shadow-[4px_4px_0px_#7A1B2E] p-6 md:p-8 -rotate-[1deg] relative z-0">
          
          <div className="mb-8">
            <h1 className="font-display text-3xl font-extrabold text-dark uppercase tracking-tight mb-2">
              USRC <span className="text-maroon">Portal</span>
            </h1>
            <p className="font-mono text-xs text-dark/60 uppercase tracking-wider">// ANGGOTA MASUK</p>
          </div>

          {message && (
            <div className="mb-6 p-4 border-2 border-green-600 bg-green-50 rounded-none">
              <p className="text-sm text-green-800 font-mono">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 border-2 border-red-600 bg-red-50 rounded-none">
              <p className="text-sm text-red-800 font-mono">{error}</p>
            </div>
          )}

          <form onSubmit={handleRequestVerification} className="space-y-4">
            <div>
              <label className="block font-display text-sm font-bold uppercase text-dark mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full border-2 border-dark px-4 py-3 text-sm font-mono placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-display font-extrabold uppercase text-sm py-3 px-4 bg-maroon text-white border-2 border-dark shadow-[4px_4px_0px_#1A1A1A] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mengirim...' : 'Kirim Link Verifikasi'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-dark">
            <p className="text-xs text-dark/60 font-mono">
              Belum punya akun? <a href="/daftar" className="underline font-bold text-maroon hover:text-hot">Daftar di sini</a>
            </p>
          </div>
        </div>

        {/* Decorative corner */}
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-maroon border-2 border-dark rotate-45" />
      </div>
    </div>
  );
}
