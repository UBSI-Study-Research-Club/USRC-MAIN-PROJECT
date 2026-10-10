'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!validateEmail(email)) {
      setError('Format email salah. Gunakan email yang valid.');
      return;
    }

    setLoading(true);
    
    // shouldCreateUser: true — auth user dibuat saat minta OTP, karena form
    // daftar tidak bisa bikin akun (anon tidak punya hak tulis auth.users).
    // Gerbang membership = profiles row (dibuat saat approve), bukan login.
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/absen` : undefined,
      },
    });

    setLoading(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes('signups not allowed') || signInError.status === 400) {
         setError('Email belum terdaftar. Hubungi admin USRC.');
      } else if (signInError.message.includes('rate limit')) {
         setError('Terlalu banyak percobaan. Tunggu beberapa saat.');
      } else {
         setError('Gagal mengirim link/OTP. Coba lagi nanti.');
      }
      return;
    }

    setStep('otp');
    setMessage('Kode verifikasi telah dikirim ke email kamu. Cek Gmail.');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length < 6 || otp.length > 8) {
      setError('Kode verifikasi harus 6-8 karakter.');
      return;
    }

    setLoading(true);

    // Coba magiclink dulu (user lama); fallback signup (user baru pertama kali)
    let verifyError: { message: string } | null = null;
    {
      const res = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'magiclink',
      });
      verifyError = res.error;
      if (verifyError) {
        const retry = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'signup',
        });
        if (!retry.error) verifyError = null;
        else verifyError = retry.error;
      }
    }

    setLoading(false);

    if (verifyError) {
      if (verifyError.message.toLowerCase().includes('expired')) {
        setError('Kode OTP kadaluarsa. Silakan minta kode baru.');
      } else {
        setError('Kode OTP salah.');
      }
      return;
    }

    // Success, redirect to member attendance page
    router.push('/absen');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper">
      <div className="fade-up relative w-full max-w-sm">
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
            <p className="font-body text-sm text-dark/70">
              {step === 'email' 
                ? 'Masuk menggunakan email yang terdaftar.' 
                : 'Masukkan kode yang dikirim ke emailmu (6-8 karakter).'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-maroon text-maroon font-mono text-xs">
              {'//'} ERROR: {error}
            </div>
          )}

          {message && !error && (
            <div className="mb-6 p-3 bg-green-50 border-l-4 border-green-600 text-green-800 font-mono text-xs">
              {'//'} INFO: {message}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block font-mono text-xs font-semibold text-dark uppercase">
                  Alamat Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@mhs.bsi.ac.id"
                  className="w-full bg-paper border-2 border-dark p-3 font-body text-sm outline-none focus:ring-2 focus:ring-pink focus:border-maroon transition-all"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full group relative flex items-center justify-center gap-2 bg-maroon text-white border-2 border-dark py-3 px-4 font-display font-bold uppercase tracking-wider hover:bg-hot hover:-translate-y-1 hover:shadow-[3px_3px_0px_#1A1A1A] transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kirim Kode'}
                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="otp" className="block font-mono text-xs font-semibold text-dark uppercase">
                  Kode Verifikasi
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="text" autoCapitalize="characters"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full bg-paper border-2 border-dark p-3 font-mono text-center tracking-[0.5em] text-lg outline-none focus:ring-2 focus:ring-pink focus:border-maroon transition-all"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full group relative flex items-center justify-center gap-2 bg-maroon text-white border-2 border-dark py-3 px-4 font-display font-bold uppercase tracking-wider hover:bg-hot hover:-translate-y-1 hover:shadow-[3px_3px_0px_#1A1A1A] transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verifikasi Masuk'}
                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError(null); setMessage(null); }}
                className="w-full text-center font-mono text-xs text-dark/60 hover:text-maroon underline decoration-dotted mt-4"
                disabled={loading}
              >
                Ganti alamat email
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
