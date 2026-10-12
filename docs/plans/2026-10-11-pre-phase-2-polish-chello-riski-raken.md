# Pre-Phase 2 Polish Plan — Chello, Riski, Raken

> Status: sebelum masuk Phase 2. Fokus: rapikan UX Phase 1 yang sudah live, bukan tambah fitur besar.

**Goal:** Memperbaiki bagian yang terasa mentah di MVP Phase 1: navbar landing, form pendaftaran, dan dashboard sekretaris agar lebih siap dipakai anggota baru.

**Architecture:** Perubahan dibagi per orang dan per PR. Chello pegang tampilan publik/form. Riski pegang dashboard sekretaris dan data anggota. Raken pegang audit, DB/RLS guard, keputusan produk, dan merge review.

**Tech Stack:** Next.js 15, React, Tailwind CSS, Supabase, Vercel.

---

## Ringkasan Tugas

| PIC | Area | Output |
|---|---|---|
| Chello | Landing navbar + form pendaftaran | Navbar atas lebih hidup, placeholder contoh di form dihapus, field alasan dibuat lebih kreatif |
| Riski | Dashboard Sekretaris | Tab/list semua anggota, urut A-Z, tampil NIM/prodi/alasan, search anggota |
| Raken | Review & system guard | Tentukan data source final, cek RLS, audit PR, approve/merge, test live |

---

# 1. Tugas Chello — Polish Navbar Landing + Form Pendaftaran

## 1.1 Masalah

Landing page bagian navbar atas USRC masih terasa terlalu polos karena menu memakai gaya `// TENTANG`, `// SESI`, `// PROJECT`. Secara visual, ini terlalu developer-comment dan kurang terasa seperti website organisasi mahasiswa.

Form pendaftaran juga masih punya placeholder contoh di beberapa field:
- `Contoh: Chello Pratama`
- `Contoh: 12345678`
- `nama@bsi.ac.id`

Placeholder contoh ini mengganggu karena user bisa merasa harus mengikuti contoh tertentu. Yang boleh tetap kreatif hanya kolom **Alasan Gabung**.

## 1.2 Scope Chello

Files utama:
- `src/app/(public)/page.tsx`
- `src/app/(public)/daftar/page.tsx`

Jangan sentuh:
- `package.json`
- `package-lock.json`
- `supabase/schema.sql`
- auth logic
- dashboard sekre

## 1.3 Task Chello A — Redesign Navbar Atas Landing

**Objective:** Navbar landing tidak lagi terlalu polos dan tidak bergantung pada `//` sebagai gaya utama.

**File:**
- Modify: `src/app/(public)/page.tsx`

**Current issue:**
Menu terlihat seperti komentar kode:
- `// TENTANG`
- `// SESI`
- `// PROJECT`

**Expected direction:**
Bebas kreatif, tapi tetap sesuai style USRC:
- editorial/neobrutalist
- maroon/paper/dark
- border tebal
- tidak template AI generic
- tidak glassmorphism berlebihan

**Opsi desain yang boleh dipakai:**

Option 1 — Ticket Nav:
```txt
[01 TENTANG] [02 SESI] [03 PROJECT]
```

Option 2 — Label Nav:
```txt
TENTANG_USRC  ·  SESI  ·  PROJECT
```

Option 3 — Badge Nav:
```txt
TENTANG     SESI AKTIF     KARYA
```
Dengan active/hover state pakai background `#FFF3C4` atau maroon.

Option 4 — Editorial Nav:
```txt
TENTANG
SESI
KARYA
```
Tapi tiap item punya small top border / underline / hover shift.

**Acceptance criteria:**
- Tidak ada `//` di navbar utama.
- Navbar tetap responsive.
- Hover state jelas.
- Link tetap jalan ke section yang sama.
- Logo USRC tetap ada.
- Tombol Daftar/Login tetap tidak rusak.

**Verification:**
Run:
```bash
npm run build
```
Expected:
```txt
Compiled successfully
```

Manual check:
- Buka landing page.
- Navbar atas terlihat lebih matang.
- Klik TENTANG/SESI/PROJECT tetap scroll ke section benar.

---

## 1.4 Task Chello B — Hapus Placeholder Contoh di Form Pendaftaran

**Objective:** Form pendaftaran lebih bersih, tidak terlihat seperti form dummy.

**File:**
- Modify: `src/app/(public)/daftar/page.tsx`

**Remove placeholder contoh dari:**

Nama Lengkap:
```tsx
placeholder="Contoh: Chello Pratama"
```
Ganti menjadi kosong atau teks netral:
```tsx
placeholder=""
```
atau hapus prop `placeholder`.

NIM:
```tsx
placeholder="Contoh: 12345678"
```
Ganti menjadi kosong atau hapus prop.

Email:
```tsx
placeholder="nama@bsi.ac.id"
```
Ganti menjadi kosong atau hapus prop.

**Kolom Program Studi:**
Boleh tetap punya option:
```txt
— Pilih prodi —
```
Karena ini bukan contoh, tapi default select.

**Acceptance criteria:**
- Nama, NIM, Email tidak punya contoh palsu.
- Label tetap jelas.
- Required validation tetap jalan.
- Tidak mengubah logic submit.

---

## 1.5 Task Chello C — Bikin Kolom Alasan Gabung Lebih Menarik

**Objective:** Field alasan masuk USRC boleh lebih kreatif, karena bagian ini memang butuh memancing jawaban jujur.

**File:**
- Modify: `src/app/(public)/daftar/page.tsx`

**Current:**
```tsx
placeholder="Ceritakan singkat kenapa tertarik gabung USRC..."
```

**Boleh diganti ke salah satu gaya:**

Option 1 — lebih natural:
```txt
Ceritain singkat: kamu pengen belajar apa, bikin apa, atau cari teman diskusi soal apa?
```

Option 2 — lebih editorial:
```txt
Tulis alasanmu. Bukan harus keren — yang penting jujur: mau belajar, riset, build project, atau cari circle produktif.
```

Option 3 — microcopy di bawah textarea:
```tsx
<p className="mt-1 font-mono text-[10px] uppercase text-dark/50">
  Tidak harus formal. 1-3 kalimat cukup.
</p>
```

**Acceptance criteria:**
- Kolom alasan tetap optional.
- Placeholder boleh ada hanya di field alasan.
- Copy terasa manusiawi, bukan AI generic.
- Tidak menambah dependency.

---

## 1.6 Branch & PR Chello

Branch:
```bash
git checkout main
git pull origin main
git checkout -b polish/chello-navbar-daftar
```

Commit:
```bash
git add src/app/(public)/page.tsx src/app/(public)/daftar/page.tsx
git commit -m "polish(public): refine landing navbar and registration form copy"
git push origin polish/chello-navbar-daftar
```

PR title:
```txt
polish(public): navbar landing dan form pendaftaran
```

PR notes wajib:
```txt
- Navbar landing tidak lagi memakai gaya //
- Placeholder contoh di form pendaftaran dihapus
- Kolom alasan gabung dibuat lebih natural/kreatif
- npm run build: pass
```

---

# 2. Tugas Riski — Tambah List Semua Anggota di Dashboard Sekretaris

## 2.1 Masalah

Dashboard Sekretaris sekarang sudah punya:
- Absensi Realtime
- Antrian Pendaftar

Tapi sekretaris belum punya tempat untuk melihat **semua anggota aktif**. Akibatnya sekretaris sulit cek siapa saja anggota yang sudah approve, NIM-nya apa, prodinya apa, dan alasan awal mereka masuk USRC.

## 2.2 Scope Riski

Files utama:
- `src/app/(dashboard)/dashboard/sekre/page.tsx`

Kemungkinan file tambahan jika perlu:
- Tidak perlu file baru dulu. Satu file cukup.

Jangan sentuh:
- landing page
- daftar page
- package files
- schema SQL, kecuali Raken minta

## 2.3 Data Source

Data anggota aktif ada di `profiles`.

Data alasan masuk USRC ada di `registrations.reason`.

Karena `profiles` tidak menyimpan `reason`, cara paling aman untuk MVP polish:
- fetch `profiles` untuk semua anggota aktif
- fetch `registrations` status `approved`
- cocokkan berdasarkan `nim` atau `email` jika tersedia

Catatan teknis:
- `profiles` saat ini punya: `id`, `full_name`, `nim`, `prodi`, `role`, `created_at`
- `registrations` punya: `full_name`, `email`, `nim`, `prodi`, `reason`, `status`, `created_at`
- Kalau email tidak ada di profiles, matching pakai `nim` dulu.

Minimum query yang bisa dipakai:
```ts
const { data: profilesData } = await supabase
  .from('profiles')
  .select('id, full_name, nim, prodi, role, created_at')
  .order('full_name', { ascending: true })

const { data: approvedRegs } = await supabase
  .from('registrations')
  .select('nim, reason')
  .eq('status', 'approved')
```

Lalu merge di client:
```ts
const reasonByNim = new Map((approvedRegs || []).map((r) => [r.nim, r.reason]))
const members = (profilesData || []).map((p) => ({
  ...p,
  reason: reasonByNim.get(p.nim) || null,
}))
```

## 2.4 Task Riski A — Tambah Tab “Anggota” di Dashboard Sekre

**Objective:** Di samping tab `Antrian Pendaftar`, tambah tab baru `Anggota`.

**File:**
- Modify: `src/app/(dashboard)/dashboard/sekre/page.tsx`

**Current activeTab:**
```ts
const [activeTab, setActiveTab] = useState<'absen' | 'registrations'>('absen')
```

**Change to:**
```ts
const [activeTab, setActiveTab] = useState<'absen' | 'registrations' | 'members'>('absen')
```

Add button setelah `Antrian Pendaftar`:
```tsx
<button
  onClick={() => setActiveTab('members')}
  className={`px-5 py-2.5 font-bold uppercase font-['Outfit'] text-sm border-2 border-[#1A1A1A] border-b-0 transition-all relative ${
    activeTab === 'members'
      ? 'bg-[#7A1B2E] text-white shadow-[2px_-2px_0_#1A1A1A]'
      : 'bg-white text-[#1A1A1A] hover:bg-gray-50'
  }`}
>
  <div className="flex items-center gap-2">
    <Users className="w-4 h-4" />
    <span>Anggota</span>
    <span className="bg-[#FFF3C4] text-[#1A1A1A] font-mono text-[10px] px-1.5 py-0.2 border border-[#1A1A1A] font-black">
      {members.length}
    </span>
  </div>
</button>
```

Acceptance:
- Tab baru muncul.
- Klik tab tidak error.
- Tab aktif punya style sama seperti tab lain.

---

## 2.5 Task Riski B — Fetch Semua Anggota Aktif

**Objective:** Dashboard sekre bisa ambil semua profile anggota, urut nama A-Z.

**File:**
- Modify: `src/app/(dashboard)/dashboard/sekre/page.tsx`

Add type:
```ts
type Member = {
  id: string
  full_name: string
  nim: string
  prodi: string
  role: 'anggota' | 'sekre' | 'admin'
  created_at: string
  reason: string | null
}
```

Add state:
```ts
const [members, setMembers] = useState<Member[]>([])
const [loadingMembers, setLoadingMembers] = useState(true)
const [memberSearch, setMemberSearch] = useState('')
```

Add fetch function inside first `useEffect`:
```ts
const fetchMembers = async () => {
  try {
    setLoadingMembers(true)

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, nim, prodi, role, created_at')
      .order('full_name', { ascending: true })

    if (profilesError) throw profilesError

    const { data: approvedRegs, error: regsError } = await supabase
      .from('registrations')
      .select('nim, reason')
      .eq('status', 'approved')

    if (regsError) throw regsError

    const reasonByNim = new Map((approvedRegs || []).map((r) => [r.nim, r.reason]))

    const merged = (profilesData || []).map((p) => ({
      ...p,
      reason: reasonByNim.get(p.nim) || null,
    }))

    setMembers(merged as Member[])
  } catch (err) {
    console.error('Error fetching members:', err)
  } finally {
    setLoadingMembers(false)
  }
}
```

Call it:
```ts
fetchMembers()
```

Also call after approve registration:
```ts
// after approve success
fetchMembers()
```

If function scope makes this hard, keep simple:
- fetchMembers inside useEffect for first version
- after approve, rely on page refresh or realtime later
- but better: define fetchMembers outside useEffect with `useCallback` only if needed

Ponytail approach: first version can refetch when tab opened or after approval by calling a locally scoped function if clean. Do not over-abstract.

---

## 2.6 Task Riski C — Search Anggota

**Objective:** Sekre bisa cari anggota dari nama, NIM, prodi, atau alasan.

**File:**
- Modify: `src/app/(dashboard)/dashboard/sekre/page.tsx`

Add derived list before return:
```ts
const filteredMembers = members.filter((member) => {
  const q = memberSearch.trim().toLowerCase()
  if (!q) return true

  return [
    member.full_name,
    member.nim,
    member.prodi,
    member.role,
    member.reason || '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(q)
})
```

Acceptance:
- Search kosong menampilkan semua anggota.
- Search nama jalan.
- Search NIM jalan.
- Search alasan jalan kalau reason ada.
- Search case-insensitive.

---

## 2.7 Task Riski D — Render Tabel Anggota

**Objective:** Tab Anggota menampilkan semua anggota aktif dengan data lengkap.

**File:**
- Modify: `src/app/(dashboard)/dashboard/sekre/page.tsx`

Add tab content setelah block registrations:
```tsx
{activeTab === 'members' && (
  <div className="space-y-4">
    <div className="border-2 border-[#1A1A1A] bg-white shadow-[4px_4px_0_#1A1A1A] overflow-hidden">
      <div className="p-4 bg-[#F5F3EF] border-b-2 border-[#1A1A1A] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="font-black uppercase font-['Outfit'] text-sm">
            Semua Anggota ({filteredMembers.length})
          </h3>
          <p className="font-mono text-[10px] uppercase text-gray-500 mt-1">
            Urut nama A-Z. Data alasan diambil dari pendaftaran approved.
          </p>
        </div>
        <input
          type="search"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          placeholder="Cari nama, NIM, prodi, alasan..."
          className="w-full md:w-80 border-2 border-[#1A1A1A] bg-white px-3 py-2 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7A1B2E]"
        />
      </div>

      {loadingMembers ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#7A1B2E]" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-8 text-center font-mono text-xs text-gray-500">
          Tidak ada anggota yang cocok dengan pencarian.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#1A1A1A] font-mono text-xs bg-[#F5F3EF]">
                <th className="p-3 border-r-2 border-[#1A1A1A]">Nama</th>
                <th className="p-3 border-r-2 border-[#1A1A1A]">NIM</th>
                <th className="p-3 border-r-2 border-[#1A1A1A]">Prodi/Kelas</th>
                <th className="p-3 border-r-2 border-[#1A1A1A]">Role</th>
                <th className="p-3">Alasan Masuk USRC</th>
              </tr>
            </thead>
            <tbody className="font-['Work_Sans'] text-sm">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="border-b border-[#1A1A1A] hover:bg-gray-50">
                  <td className="p-3 border-r-2 border-[#1A1A1A] font-bold">
                    {member.full_name}
                  </td>
                  <td className="p-3 border-r-2 border-[#1A1A1A] font-mono text-xs">
                    {member.nim}
                  </td>
                  <td className="p-3 border-r-2 border-[#1A1A1A] text-xs font-bold">
                    {member.prodi}
                  </td>
                  <td className="p-3 border-r-2 border-[#1A1A1A]">
                    <span className="inline-block font-mono text-[10px] px-2 py-0.5 border border-[#1A1A1A] bg-[#FFF3C4] font-bold uppercase">
                      {member.role}
                    </span>
                  </td>
                  <td className="p-3 text-xs italic text-gray-700 max-w-md">
                    {member.reason || 'Belum ada alasan tersimpan.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
)}
```

Catatan:
- User minta "nim kelas". Di database sekarang yang ada `prodi`, belum ada `kelas` terpisah.
- Untuk MVP polish, tampilkan kolom `Prodi/Kelas` dengan data `prodi` dulu.
- Kalau nanti butuh kelas beneran, Raken harus putuskan apakah tambah kolom `kelas` di `registrations` dan `profiles`.

---

## 2.8 Branch & PR Riski

Branch:
```bash
git checkout main
git pull origin main
git checkout -b feat/riski-member-list-sekre
```

Commit:
```bash
git add src/app/(dashboard)/dashboard/sekre/page.tsx
git commit -m "feat(sekre): add searchable member list"
git push origin feat/riski-member-list-sekre
```

PR title:
```txt
feat(sekre): list semua anggota dengan search
```

PR notes wajib:
```txt
- Tambah tab Anggota di Dashboard Sekretaris
- Data urut nama A-Z
- Tampil nama, NIM, prodi/kelas, role, alasan masuk USRC
- Search nama/NIM/prodi/alasan
- npm run build: pass
```

---

# 3. Tugas Raken — Lead, Audit, dan System Guard

## 3.1 Kenapa Raken tetap punya tugas?

Ada. Karena perubahan ini kelihatan UI, tapi ada implikasi data:
- `kelas` belum ada di database
- `reason` ada di `registrations`, bukan `profiles`
- sekre boleh baca data anggota karena RLS profiles memang allow sekre/admin read all
- tapi matching alasan dari registration perlu dicek agar tidak salah orang

Jadi tugas Raken bukan nambah UI banyak, tapi memastikan perubahan tidak bikin data salah.

---

## 3.2 Task Raken A — Putuskan Data “Kelas”

**Problem:** User minta list anggota berisi `nim kelas dan alasan`. Database sekarang punya `prodi`, bukan `kelas`.

Pilihan:

### Option A — Sekarang pakai `prodi` dulu
Label UI: `Prodi/Kelas`

Pros:
- Tidak perlu migrasi DB
- Cepat
- Aman

Cons:
- Belum benar-benar punya kelas seperti `15.3A.01`

### Option B — Tambah field `kelas`
Butuh migrasi:
```sql
alter table public.registrations add column if not exists kelas text;
alter table public.profiles add column if not exists kelas text;
```
Lalu form daftar harus tambah input kelas.

Pros:
- Data lebih lengkap

Cons:
- Perlu update schema, form daftar, approve RPC, profil, dashboard
- Lebih cocok masuk batch setelah polish, bukan tugas kecil Riski

**Rekomendasi:**
Untuk pre-Phase 2 ini pakai Option A: `Prodi/Kelas = prodi`. Tambah `kelas` nanti kalau memang organisasi butuh data kelas formal.

---

## 3.3 Task Raken B — Cek SQL/RLS Tidak Perlu Diubah

Cek:
- `profiles` select policy sudah allow sekre/admin read all:
```sql
using (auth.uid() = id or get_my_role() in ('sekre', 'admin'))
```
- `registrations` select policy sudah allow sekre/admin read all:
```sql
using (get_my_role() in ('sekre', 'admin'))
```

Kalau dua policy ini masih ada, Riski tidak perlu tambah SQL.

Verification via app:
- Login sebagai sekre.
- Buka Dashboard Sekretaris.
- Tab Anggota harus bisa baca profiles + registrations.

---

## 3.4 Task Raken C — Review PR Chello

Checklist:
- Tidak ada perubahan `package.json` / `package-lock.json`.
- Navbar tidak pakai `//` lagi.
- Link tetap jalan.
- Form pendaftaran tidak punya placeholder contoh di Nama/NIM/Email.
- Alasan Gabung masih punya microcopy yang bagus.
- Build pass.
- Design tidak AI-template, tetap USRC editorial/neobrutalist.

If good:
- approve
- merge

If bad:
- request changes, jangan merge sendiri kecuali Raken mau bypass.

---

## 3.5 Task Raken D — Review PR Riski

Checklist:
- Tidak ada perubahan package files.
- Tab Anggota muncul di dashboard sekre.
- Semua anggota urut A-Z.
- Search jalan untuk nama/NIM/prodi/alasan.
- Data reason tidak bikin error kalau null.
- Empty state jelas.
- Build pass.
- RLS aman: hanya sekre/admin yang bisa lihat halaman ini.

Manual live test:
1. Login sebagai Raken/admin atau Riski/Iwan sekre.
2. Buka `/dashboard/sekre`.
3. Klik tab `Anggota`.
4. Search nama anggota.
5. Search NIM.
6. Search kata dari alasan.
7. Approve pendaftar baru lalu cek apakah anggota baru muncul setelah refresh.

---

## 3.6 Task Raken E — Final Integrated Audit

Setelah PR Chello dan Riski siap:

```bash
git checkout main
git pull origin main
git merge origin/polish/chello-navbar-daftar --no-commit
npm run build
git merge --abort

git merge origin/feat/riski-member-list-sekre --no-commit
npm run build
git merge --abort
```

Kalau dua-duanya aman, merge via GitHub.

Setelah merge:
- tunggu Vercel deploy
- test landing
- test daftar
- test dashboard sekre tab anggota
- kabari grup Main Project

---

# 4. Definition of Done

Semua task dianggap selesai kalau:

- [ ] Chello PR merged: navbar landing lebih matang, form daftar bersih.
- [ ] Riski PR merged: dashboard sekre punya tab anggota searchable.
- [ ] `npm run build` pass setelah dua PR masuk main.
- [ ] Vercel deploy sukses.
- [ ] Raken test live minimal 5 menit.
- [ ] Grup Main Project dikabari: pre-Phase 2 polish done.

---

# 5. Pesan untuk Tim

Chello:
> Fokus ke rasa halaman publik. Jangan ubah logic, jangan sentuh package file. Navbar dibuat lebih hidup, form daftar dibuat lebih bersih.

Riski:
> Fokus ke dashboard sekre. Tambah tab Anggota: list A-Z, NIM, prodi/kelas, alasan, search. Jangan ubah DB dulu.

Raken:
> Fokus ke keputusan data, RLS, review PR, test gabungan, merge, dan komunikasi tim.

---

# 6. Urutan Kerja Disarankan

1. Raken share plan ini ke grup Main Project.
2. Chello dan Riski pull main terbaru.
3. Chello kerjakan branch `polish/chello-navbar-daftar`.
4. Riski kerjakan branch `feat/riski-member-list-sekre`.
5. Masing-masing buka PR.
6. Raken audit diff.
7. Raken merge kalau build pass.
8. Raken test live.

---

Last updated: 2026-10-11
