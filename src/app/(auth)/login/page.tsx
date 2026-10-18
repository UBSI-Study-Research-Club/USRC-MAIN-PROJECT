'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck, Mail, Check } from 'lucide-react';


export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  };

  const handleSendOtp = async (e: React.FormEvent | React.MouseEvent) => {
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
    setOtp('');
    setMessage('Kode verifikasi terkirim. Cek inbox / folder spam email kamu.');
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

    // Success — langsung ke dashboard anggota sesuai PRD Phase 3
    router.push('/dashboard');
  };

  const resetToEmail = () => { setStep('email'); setOtp(''); setError(null); setMessage(null); };
  const otpBoxes = otp.length > 6 ? 8 : 6;

  return (
    <div className="min-h-[100dvh] bg-paper lg:grid lg:grid-cols-2">
      {/* Panel branding — desktop saja */}
      <aside className="relative hidden overflow-hidden border-r-[3px] border-dark bg-maroon p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(45deg,#fff_0_2px,transparent_2px_14px)]" />
        <Link href="/" className="relative inline-flex w-fit items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
        </Link>
        <div className="relative">
          <span className="mb-5 inline-flex -rotate-2 items-center gap-2 border-2 border-dark bg-[#FFF3C4] px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-dark shadow-[3px_3px_0_#1A1A1A]">
            <ShieldCheck className="h-4 w-4 text-maroon" /> Area Anggota
          </span>
          <h2 className="font-display text-6xl font-black uppercase leading-[.9] tracking-tight xl:text-7xl">
            Study.<br />Research.<br /><span className="text-[#FFF3C4]">Build.</span>
          </h2>
          <p className="mt-6 max-w-md font-mono text-sm leading-relaxed text-white/80">
            Absen sesi, pantau feed karya, dan atur profil pixel kamu — semua dari satu portal.
          </p>
        </div>
        <p className="relative font-mono text-[11px] uppercase tracking-widest text-white/60">
          USRC · UBSI Pontianak
        </p>
      </aside>

      {/* Form */}
      <main className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-8 lg:justify-center lg:px-16">
        <Link href="/" className="mb-8 inline-flex w-fit items-center gap-2 font-mono text-xs uppercase tracking-widest text-dark/60 hover:text-maroon lg:hidden">
          <ArrowLeft className="h-4 w-4" /> Beranda
        </Link>

        <div className="fade-up mx-auto w-full max-w-md">
          <div className="mb-8">
            <span className="mb-4 inline-flex items-center gap-2 border-2 border-dark bg-[#FFF3C4] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-dark lg:hidden">
              <ShieldCheck className="h-3.5 w-3.5 text-maroon" /> Area Anggota
            </span>
            <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tight text-dark sm:text-5xl">
              USRC <span className="text-maroon">Portal</span>
            </h1>
            <p className="mt-3 text-sm text-dark/70">
              {step === 'email'
                ? 'Masuk tanpa password — kami kirim kode verifikasi ke email terdaftar.'
                : <>Kode dikirim ke <b className="break-all text-dark">{email}</b>.</>}
            </p>
          </div>

          {/* Indikator langkah */}
          <ol className="mb-6 grid grid-cols-2 gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            {(['Email', 'Kode OTP'] as const).map((label, i) => {
              const active = (i === 0 && step === 'email') || (i === 1 && step === 'otp');
              const done = i === 0 && step === 'otp';
              return (
                <li
                  key={label}
                  className={`flex items-center gap-2 border-2 px-3 py-2 ${
                    active ? 'border-dark bg-white shadow-[3px_3px_0_#7A1B2E]' : done ? 'border-dark bg-[#D1E7DD]' : 'border-dark/20 text-dark/40'
                  }`}
                >
                  <span className={`grid h-5 w-5 place-items-center border-2 text-[10px] ${active ? 'border-dark bg-maroon text-white' : done ? 'border-dark bg-white' : 'border-dark/20'}`}>
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                  </span>
                  {label}
                </li>
              );
            })}
          </ol>

          <div className="border-[3px] border-dark bg-white p-5 shadow-[6px_6px_0_#7A1B2E] sm:p-7">
            {error && (
              <div role="alert" className="mb-5 border-l-4 border-maroon bg-red-50 p-3 font-mono text-xs text-maroon">
                {error}
              </div>
            )}
            {message && !error && (
              <div role="status" className="mb-5 border-l-4 border-green-600 bg-green-50 p-3 font-mono text-xs text-green-800">
                {message}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="block font-mono text-xs font-semibold uppercase text-dark">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark/40" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@mhs.bsi.ac.id"
                      className="w-full border-2 border-dark bg-paper py-3 pl-10 pr-3 text-base outline-none transition-all focus:border-maroon focus:bg-white focus:shadow-[3px_3px_0_#7A1B2E]"
                      disabled={loading}
                    />
                  </div>
                </div>
                <SubmitButton loading={loading} label="Kirim Kode" />
                <p className="text-center font-mono text-[11px] text-dark/50">
                  Belum jadi anggota?{' '}
                  <Link href="/daftar" className="font-semibold text-maroon underline underline-offset-2">Daftar dulu</Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="otp" className="block font-mono text-xs font-semibold uppercase text-dark">
                    Kode Verifikasi
                  </label>
                  {/* Satu input asli (paste & autofill OTP tetap jalan), kotak hanya tampilan */}
                  <div className="relative">
                    <div aria-hidden="true" className="flex justify-between gap-1.5 sm:gap-2">
                      {Array.from({ length: otpBoxes }).map((_, i) => {
                        const filled = i < otp.length;
                        const current = otpFocused && i === Math.min(otp.length, otpBoxes - 1);
                        return (
                          <span
                            key={i}
                            className={`grid h-12 min-w-0 flex-1 place-items-center border-2 font-mono text-xl font-bold transition-all sm:h-14 sm:text-2xl ${
                              current ? 'border-maroon bg-white shadow-[3px_3px_0_#7A1B2E]' : filled ? 'border-dark bg-white' : 'border-dark/30 bg-paper'
                            }`}
                          >
                            {otp[i] ?? ''}
                          </span>
                        );
                      })}
                    </div>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={8}
                      value={otp}
                      onFocus={() => setOtpFocused(true)}
                      onBlur={() => setOtpFocused(false)}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="absolute inset-0 h-full w-full cursor-text opacity-0"
                      disabled={loading}
                    />
                  </div>
                </div>

                <SubmitButton loading={loading} label="Verifikasi & Masuk" />

                <div className="flex items-center justify-between gap-3 font-mono text-xs">
                  <button type="button" onClick={resetToEmail} disabled={loading} className="text-dark/60 underline decoration-dotted hover:text-maroon">
                    Ganti email
                  </button>
                  <button type="button" onClick={handleSendOtp} disabled={loading} className="text-dark/60 underline decoration-dotted hover:text-maroon">
                    Kirim ulang kode
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex w-full items-center justify-center gap-2 border-2 border-dark bg-maroon px-4 py-3.5 font-display font-bold uppercase tracking-wider text-white shadow-[3px_3px_0_#1A1A1A] transition-all hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-70"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : label}
      {!loading && <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />}
    </button>
  );
}
