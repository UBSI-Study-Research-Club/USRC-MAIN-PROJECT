// Tes mandiri fungsi murni ogCover (tanpa jaringan kecuali diabaikan).
// Jalankan: node --test scripts/og-cover.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickCoverSource, isPrivateIp, extractImageCandidates, assertPublicHttpUrl } from '../src/lib/karya/ogCover.ts'

// ── pickCoverSource ──
test('pilih link live duluan, sosmed diprioritaskan paling akhir', () => {
  const url = pickCoverSource([
    { link_type: 'instagram', url: 'https://instagram.com/p/x' },
    { link_type: 'live', url: 'https://rm-bg.curzy.dev/' },
    { link_type: 'repo', url: 'https://github.com/a/b' },
  ])
  assert.equal(url, 'https://rm-bg.curzy.dev/')
})

test('link other dipakai kalau gak ada live/web', () => {
  const url = pickCoverSource([
    { link_type: 'other', url: 'https://ragam-arsip-batik.vercel.app/' },
  ])
  assert.equal(url, 'https://ragam-arsip-batik.vercel.app/')
})

test('sosmed dipakai sebagai upaya terakhir', () => {
  const url = pickCoverSource([{ link_type: 'instagram', url: 'https://instagram.com/p/x' }])
  assert.equal(url, 'https://instagram.com/p/x')
})

test('tanpa link -> null', () => {
  assert.equal(pickCoverSource([]), null)
  assert.equal(pickCoverSource([{ link_type: 'x', url: '   ' }]), null)
})

// ── isPrivateIp ──
test('IP privat/loopback terdeteksi', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.1', '172.16.0.1', '169.254.1.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.ok(isPrivateIp(ip), `${ip} harus privat`)
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '1.1.1.1']) {
    assert.ok(!isPrivateIp(ip), `${ip} harus publik`)
  }
})

// ── extractImageCandidates ──
test('ekstrak og:image + twitter:image + favicon, resolve relatif, dedupe', () => {
  const html = `
    <html><head>
    <meta property="og:image" content="/cover.png">
    <meta property="og:image" content="/cover.png">
    <meta name="twitter:image" content="https://cdn.contoh.id/tw.jpg">
    <link rel="icon" href="/favicon.ico">
    </head></html>`
  const out = extractImageCandidates(html, 'https://contoh.id/halaman/')
  assert.deepEqual(out, [
    'https://contoh.id/cover.png',
    'https://cdn.contoh.id/tw.jpg',
    'https://contoh.id/favicon.ico',
  ])
})

test('html kosong -> fallback favicon.ico', () => {
  const out = extractImageCandidates('<html><head></head></html>', 'https://contoh.id')
  assert.deepEqual(out, ['https://contoh.id/favicon.ico'])
})

// ── assertPublicHttpUrl (kasus tanpa DNS: IP literal & localhost) ──
test('tolak localhost, IP privat, dan skema bukan http(s)', async () => {
  await assert.rejects(() => assertPublicHttpUrl('http://localhost:3000'), /internal/)
  await assert.rejects(() => assertPublicHttpUrl('http://127.0.0.1/admin'), /privat/)
  await assert.rejects(() => assertPublicHttpUrl('http://192.168.1.5/x'), /privat/)
  await assert.rejects(() => assertPublicHttpUrl('http://10.0.0.9/'), /privat/)
  await assert.rejects(() => assertPublicHttpUrl('ftp://contoh.id/file'), /skema/)
  await assert.rejects(() => assertPublicHttpUrl('bukan-url'), /valid/)

  // IP publik lolos tanpa DNS (isIP short-circuit)
  const u = await assertPublicHttpUrl('https://8.8.8.8/dns-query')
  assert.equal(u.hostname, '8.8.8.8')
})
