import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// In-memory rate limiter store for Edge/Middleware (Anti-spam / Anti-queue surge)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 POST requests per minute per IP

export async function middleware(request: NextRequest) {
  // Rate limiting check for mutating POST requests (registrations, logins, etc.)
  if (request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
    
    const now = Date.now();
    const record = ipRequestCounts.get(ip);

    if (record && now < record.resetTime) {
      if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return new NextResponse(
          JSON.stringify({ error: 'Terlalu banyak permintaan dari IP ini. Silakan tunggu beberapa saat.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      record.count++;
    } else {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    // Cleanup old entries periodically using forEach (TS-safe)
    if (ipRequestCounts.size > 5000) {
      ipRequestCounts.forEach((val, key) => {
        if (now > val.resetTime) {
          ipRequestCounts.delete(key);
        }
      });
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session kalau expired (wajib untuk OTP login & RLS per-user)
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match semua path kecuali:
     * - _next/static, _next/image (assets)
     * - favicon.ico (file statis)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
