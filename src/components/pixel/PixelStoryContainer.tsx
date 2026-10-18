'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { PixelCharacter, type PixelCharacterConfig } from './PixelCharacter';
import { PixelAvatar } from './PixelAvatar';
import { Sparkles, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { SideSheet, SheetButton } from '@/components/SideSheet';
import { GLIDE } from '@/components/motion/Glide';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberDirectoryRow {
  id: string;
  full_name: string | null;
  prodi: string | null;
  role: string | null;
  instagram: string | null;
  github: string | null;
  behance: string | null;
  linkedin: string | null;
  pixel_body?: string | null;
  pixel_hair?: string | null;
  pixel_hair_color?: string | null;
  pixel_face?: string | null;
  pixel_clothing?: string | null;
  pixel_accessories?: string | null;
  chat_status?: string | null;
  chat_status_at?: string | null;
  hobbies?: string[] | null;
  about?: string | null;
  sessions_attended?: number | null;
  projects_count?: number | null;
  member_since?: number | null;
  avatar_id?: string | null;
  avatar_bg?: string | null;
}

interface Member {
  id: string;
  full_name: string;
  prodi: string;
  role: string;
  instagram: string | null;
  github: string | null;
  behance: string | null;
  linkedin: string | null;
  pixel_config: PixelCharacterConfig;
  chat_status: string | null;
  chat_status_at: Date | null;
  hobbies: string[];
  about: string | null;
  sessions_attended: number;
  projects_count: number;
  member_since: number;
  avatar_id: string | null;
  avatar_bg: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUBBLE_COLORS = ['#FFF3C4', '#FCE9ED', '#D1E7DD', '#FFFFFF'];
const TAG_BG = ['#FFFFFF', '#FFF3C4', '#FCE9ED', '#D1E7DD'];
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;
const HR_MS = 60 * MIN_MS;
const MAXLEN = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapPixelConfig(row: MemberDirectoryRow): PixelCharacterConfig {
  const hairColorMap: Record<string, PixelCharacterConfig['hair']> = {
    hitam: { style: 'short', color: 'black' },
    black: { style: 'short', color: 'black' },
    coklat: { style: 'short', color: 'brown' },
    brown: { style: 'short', color: 'brown' },
    pirang: { style: 'short', color: 'blonde' },
    blonde: { style: 'short', color: 'blonde' },
    merah: { style: 'short', color: 'red' },
    red: { style: 'short', color: 'red' },
  };
  const faceMap: Record<string, PixelCharacterConfig['face']> = {
    normal: 'neutral', neutral: 'neutral',
    smile: 'smile', wink: 'wink', focus: 'focus',
  };
  const clothingMap: Record<string, PixelCharacterConfig['clothing']> = {
    'hoodie-usrc': 'hoodie', hoodie: 'hoodie',
    casual: 'casual', tshirt: 'tshirt', jacket: 'jacket',
  };
  const accessoryMap: Record<string, PixelCharacterConfig['accessory']> = {
    none: 'none', cap: 'cap', glasses: 'glasses',
    headset: 'headset', headband: 'headband',
  };
  const hairStyle = (row.pixel_hair as any) || 'short';
  const hairColor = hairColorMap[row.pixel_hair_color || '']?.color || 'black';
  return {
    skin: (row.pixel_body as PixelCharacterConfig['skin']) || 'medium',
    hair: { style: hairStyle, color: hairColor },
    face: faceMap[row.pixel_face || ''] || 'neutral',
    clothing: clothingMap[row.pixel_clothing || ''] || 'hoodie',
    accessory: accessoryMap[row.pixel_accessories || ''] || 'none',
  };
}

function mapMember(row: MemberDirectoryRow): Member {
  return {
    id: row.id,
    full_name: row.full_name || 'Anggota',
    prodi: row.prodi || '',
    role: row.role || 'anggota',
    instagram: row.instagram || null,
    github: row.github || null,
    behance: row.behance || null,
    linkedin: row.linkedin || null,
    pixel_config: mapPixelConfig(row),
    chat_status: row.chat_status || null,
    chat_status_at: row.chat_status_at ? new Date(row.chat_status_at) : null,
    hobbies: row.hobbies || [],
    about: row.about || null,
    sessions_attended: row.sessions_attended ?? 0,
    projects_count: row.projects_count ?? 0,
    member_since: row.member_since ?? new Date().getFullYear(),
    avatar_id: row.avatar_id || null,
    avatar_bg: row.avatar_bg || null,
  };
}

function activeNote(m: Member): { text: string; at: Date } | null {
  if (!m.chat_status || !m.chat_status_at) return null;
  if (Date.now() - m.chat_status_at.getTime() >= DAY_MS) return null;
  return { text: m.chat_status, at: m.chat_status_at };
}

function ago(ms: number): string {
  const m = Math.floor(ms / MIN_MS);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  return `${Math.floor(m / 60)} jam lalu`;
}

function remaining(at: Date): string {
  const left = DAY_MS - (Date.now() - at.getTime());
  const h = Math.floor(left / HR_MS);
  const m = Math.floor(left / MIN_MS) % 60;
  return h > 0 ? `${h} jam ${m} mnt` : `${Math.max(m, 1)} mnt`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function initialOrder(members: Member[], selfId: string | null): Member[] {
  const me = members.find(m => m.id === selfId);
  const rest = members.filter(m => m.id !== selfId);
  const withNew = rest.filter(m => activeNote(m));
  const withSeen = rest.filter(m => !activeNote(m) && m.chat_status);
  const empty = rest.filter(m => !m.chat_status);
  const sorted = [
    ...withNew.sort((a, b) => (b.chat_status_at?.getTime() ?? 0) - (a.chat_status_at?.getTime() ?? 0)),
    ...withSeen.sort((a, b) => (b.chat_status_at?.getTime() ?? 0) - (a.chat_status_at?.getTime() ?? 0)),
    ...empty,
  ];
  return me ? [me, ...sorted] : sorted;
}

// ─── Link config ──────────────────────────────────────────────────────────────

type LinkKind = 'instagram' | 'github' | 'behance' | 'linkedin';

const LINK_LABEL: Record<LinkKind, string> = {
  instagram: 'Instagram',
  github: 'GitHub',
  behance: 'Behance',
  linkedin: 'LinkedIn',
};

const LINK_COLOR: Record<LinkKind, [string, string]> = {
  instagram: ['#E38595', '#1A1A1A'],
  github: ['#1A1A1A', '#FFFFFF'],
  behance: ['#FFF3C4', '#1A1A1A'],
  linkedin: ['#D1E7DD', '#1A1A1A'],
};

const LINK_ICON: Record<LinkKind, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true" className="w-6 h-6">
      <rect x="3" y="7" width="18" height="13"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true" className="w-6 h-6">
      <path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>
    </svg>
  ),
  behance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="16"/><path d="M3 9h18M8 14h8"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true" className="w-6 h-6">
      <rect x="3" y="7" width="18" height="13"/><path d="M9 7V4h6v3M3 13h18"/>
    </svg>
  ),
};

const ARROW_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true" className="w-[18px] h-[18px] text-maroon transition-transform duration-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
    <path d="M7 17L17 7M9 7h8v8"/>
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Avatar anggota: hewan pixel kalau avatar_id ada, fallback ke karakter custom lama */
function MemberAvatar({ m, sizeClass }: { m: Member; sizeClass: string }) {
  if (m.avatar_id) {
    return <PixelAvatar id={m.avatar_id} bg={m.avatar_bg} className={`${sizeClass} overflow-hidden`} />;
  }
  return <div className={`${sizeClass} flex items-center justify-center`}><PixelCharacter config={m.pixel_config} /></div>;
}


// Kertas bergaris tipis — dipakai catatan kecil (strip) dan besar (kartu member)
const LINED = 'repeating-linear-gradient(transparent 0 12px, rgba(26,26,26,.07) 12px 13px)';

/* Catatan ala Instagram Notes, versi kertas: gelembung kecil maks 2 baris di atas
   avatar, selotip washi di atas, dan dua titik "thought bubble" ke arah avatar.
   Teks lengkap tetap bisa dibaca di kartu member. */
function BubbleShape({
  text, color, tilt, idx, pop,
}: {
  text: string; color: string; tilt: string; idx: number; pop: boolean;
}) {
  return (
    <span
      className={`relative inline-flex max-w-[118px] flex-col items-center${pop ? ' ps-bubble-pop' : ''}`}
      style={{ transform: `rotate(${tilt})`, '--tilt': tilt, '--i': idx } as React.CSSProperties}
    >
      <span
        className="relative block rounded-[12px_12px_12px_5px] border-2 border-dark px-2.5 pb-1.5 pt-2 shadow-[2px_2px_0_#1A1A1A]"
        style={{ backgroundColor: color, backgroundImage: LINED }}
      >
        <span aria-hidden="true" className="absolute -top-[7px] left-1/2 h-[10px] w-[26px] -translate-x-1/2 -rotate-6 border-x-2 border-dashed border-dark/25 bg-[#E38595]/75" />
        <span
          className="block text-center font-body text-[11px] font-semibold leading-[1.25] text-dark"
          style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', overflowWrap: 'anywhere' }}
        >
          {text}
        </span>
      </span>
      {/* titik thought-bubble */}
      <span aria-hidden="true" className="-ml-5 mt-[3px] h-[8px] w-[8px] rounded-full border-2 border-dark" style={{ background: color }} />
      <span aria-hidden="true" className="-ml-9 mt-[2px] h-[5px] w-[5px] rounded-full border-[1.5px] border-dark" style={{ background: color }} />
    </span>
  );
}

function EmptyBubble({ tilt, idx, pop }: { tilt: string; idx: number; pop: boolean }) {
  return (
    <span
      className={`relative inline-flex max-w-[118px] flex-col items-center${pop ? ' ps-bubble-pop' : ''}`}
      style={{ transform: `rotate(${tilt})`, '--tilt': tilt, '--i': idx } as React.CSSProperties}
    >
      <span className="block rounded-[12px_12px_12px_5px] border-2 border-dashed border-dark bg-white px-2.5 py-1.5 transition-colors hover:bg-[#FFF3C4]">
        <span className="block text-center text-[11px] font-bold leading-[1.25] text-maroon">+ catatan</span>
      </span>
      <span aria-hidden="true" className="-ml-5 mt-[3px] h-[8px] w-[8px] rounded-full border-2 border-dashed border-dark bg-white" />
      <span aria-hidden="true" className="-ml-9 mt-[2px] h-[5px] w-[5px] rounded-full border-[1.5px] border-dashed border-dark bg-white" />
    </span>
  );
}

// ─── Banner kartu member (unik per nama) ────────────────────────────────────

function hashName(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// PRNG kecil (mulberry32) — pola sama setiap kali untuk nama yang sama
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* Banner: mosaik pixel yang di-generate dari nama (makin rapat ke kanan),
   sebagian pixel berkedip pelan, dan nama depan besar bergaris di kanan bawah. */
function NameBanner({ member, idx }: { member: Member; idx: number }) {
  const first = member.full_name.split(' ')[0].toUpperCase();
  const seed = hashName(member.full_name);
  const rand = seeded(seed);
  const base = member.avatar_bg || `hsl(${seed % 360} 55% 82%)`;
  const COLS = 30;
  const ROWS = 10;
  const INK = ['rgba(26,26,26,.16)', 'rgba(255,255,255,.6)', 'rgba(122,27,46,.28)'];

  const cells: { x: number; y: number; fill: string; twinkle: boolean; delay: number }[] = [];
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      const density = Math.pow(x / COLS, 1.6) * 0.75;
      if (rand() < density) {
        cells.push({ x, y, fill: INK[Math.floor(rand() * INK.length)], twinkle: rand() < 0.18, delay: Math.round(rand() * 3000) });
      }
    }
  }
  const nameSize = Math.min(104, Math.round(560 / Math.max(first.length, 3)));

  return (
    <div className="relative h-[150px] overflow-hidden border-b-[3px] border-dark" style={{ backgroundColor: base }}>
      {/* mosaik */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox={`0 0 ${COLS * 10} ${ROWS * 10}`} preserveAspectRatio="xMaxYMid slice">
        {cells.map((c, i) => (
          <rect
            key={i}
            x={c.x * 10 + 0.8}
            y={c.y * 10 + 0.8}
            width={8.4}
            height={8.4}
            fill={c.fill}
            className={c.twinkle ? 'ps-twinkle' : undefined}
            style={c.twinkle ? { animationDelay: `${c.delay}ms` } : undefined}
          />
        ))}
      </svg>
      {/* titik halftone halus di kiri supaya chip tetap terbaca */}
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(26,26,26,.12) 1px, transparent 1.2px)', backgroundSize: '9px 9px', maskImage: 'linear-gradient(90deg,#000,transparent 60%)', WebkitMaskImage: 'linear-gradient(90deg,#000,transparent 60%)' }} />

      {/* nama besar */}
      {/* Outline lewat text-shadow berlapis (mengikuti isi huruf) — text-stroke
          memperlihatkan garis kontur di dalam huruf pada font variabel. */}
      <span
        aria-hidden="true"
        className="absolute -bottom-3 right-3 select-none font-display font-black uppercase leading-none text-white"
        style={{
          fontSize: nameSize,
          textShadow:
            '-2px -2px 0 #1A1A1A, 2px -2px 0 #1A1A1A, -2px 2px 0 #1A1A1A, 2px 2px 0 #1A1A1A, 0 -2px 0 #1A1A1A, 0 2px 0 #1A1A1A, -2px 0 0 #1A1A1A, 2px 0 0 #1A1A1A, 5px 5px 0 #1A1A1A',
        }}
      >
        {first}
      </span>

      <span className="absolute left-4 top-4 border-2 border-dark bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-[.08em] shadow-[2px_2px_0_#1A1A1A]">
        NO. {pad(idx + 1)} · SEJAK {member.member_since}
      </span>
      <span className="absolute right-4 top-4 rotate-[3deg] border-2 border-dark bg-maroon px-3 py-0.5 font-display text-[12px] font-extrabold uppercase tracking-[.16em] text-white shadow-[3px_3px_0_#1A1A1A]">
        {member.role}
      </span>
    </div>
  );
}

// ─── Story strip item ─────────────────────────────────────────────────────────

function StoryItem({
  member, idx, isOwn, isSelected, popAll, onClickAvatar, onClickBubble,
}: {
  member: Member;
  idx: number;
  isOwn: boolean;
  isSelected: boolean;
  popAll: boolean;
  onClickAvatar: () => void;
  onClickBubble: () => void;
}) {
  const note = activeNote(member);
  const tilt = idx % 2 ? '2deg' : '-2deg';
  const color = BUBBLE_COLORS[idx % BUBBLE_COLORS.length];
  const hasNote = !!note;
  const isNew = hasNote && !isOwn;

  return (
    <li className="flex-none list-none" style={{ scrollSnapAlign: 'center' }}>
        <button
        type="button"
        onClick={onClickAvatar}
        data-id={member.id}
        className={`group flex w-[104px] flex-col items-center bg-transparent border-0 text-inherit cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-maroon focus-visible:outline-offset-3`}
        aria-haspopup="dialog"
        aria-label={`Kartu member ${member.full_name}${note ? `. Catatan: ${note.text}` : ''}`}
      >
        {/* Bubble slot — tinggi tetap supaya semua avatar rata bawah */}
        <span className="relative z-[2] w-full h-[78px] flex items-end justify-center">
          {hasNote && (
            <BubbleShape text={note!.text} color={color} tilt={tilt} idx={idx} pop={popAll} />
          )}
          {!hasNote && isOwn && (
            // klik bubble kosong buka composer, bukan kartu
            <span onClick={e => { e.stopPropagation(); onClickBubble(); }}>
              <EmptyBubble tilt={tilt} idx={idx} pop={popAll} />
            </span>
          )}
        </span>

        {/* Avatar */}
        <span
          className={`relative z-[1] w-[72px] h-[72px] mt-0.5 rounded-full overflow-hidden flex items-center justify-center transition-all duration-100
            ${isNew ? 'border-2 border-maroon shadow-[3px_3px_0_#7A1B2E]' : 'border-2 border-dark bg-paper'}
            ${isSelected ? 'bg-[#FFF3C4] border-maroon shadow-[3px_3px_0_#7A1B2E]' : ''}
            group-hover:-translate-y-0.5
          `}
        >
          <MemberAvatar m={member} sizeClass="w-full h-full" />
        </span>

        {/* Nama */}
        <span
          className={`max-w-full mt-[9px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px] font-bold uppercase tracking-[.04em]
            ${isSelected ? 'text-maroon underline decoration-2 underline-offset-4' : 'text-dark'}
          `}
        >
          {member.full_name.split(' ')[0]}
        </span>
      </button>
    </li>
  );
}

// ─── Kartu member modal ───────────────────────────────────────────────────────

function MemberCard({
  member,
  allMembers,
  selfId,
  onEditNote,
}: {
  member: Member;
  allMembers: Member[];
  selfId: string | null;
  onEditNote: () => void;
}) {
  const note = activeNote(member);
  const idx = allMembers.findIndex(m => m.id === member.id);
  const isOwn = member.id === selfId;
  const color = BUBBLE_COLORS[idx % BUBBLE_COLORS.length];

  const links: { kind: LinkKind; url: string }[] = (
    ['instagram', 'github', 'behance', 'linkedin'] as LinkKind[]
  ).filter(k => !!member[k]).map(k => ({ kind: k, url: member[k as keyof Member] as string }));

  return (
    <div className="pb-8">
      <NameBanner member={member} idx={idx} />

      <div className="flex flex-col gap-6 px-5 sm:px-7">
        {/* Avatar + identitas */}
        <div className="relative -mt-14 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-dark bg-[#FFF3C4] shadow-[5px_5px_0_#7A1B2E]">
          <MemberAvatar m={member} sizeClass="w-full h-full" />
        </div>

        <div className="-mt-2">
          <h2 id="ps-card-title" className="m-0 font-display text-[clamp(28px,7vw,40px)] font-black uppercase leading-[1.02]" style={{ overflowWrap: 'anywhere' }}>
            {member.full_name}
          </h2>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[.08em] text-dark/60">{member.prodi}</p>
          {member.about ? (
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-dark/80" style={{ overflowWrap: 'anywhere' }}>{member.about}</p>
          ) : (
            <p className="mt-3 font-mono text-[13px] text-dark/50">{isOwn ? 'Kamu belum menulis tentang dirimu.' : 'Belum ada deskripsi.'}</p>
          )}
        </div>

        {/* Catatan */}
        {note ? (
          <div
            className="relative -rotate-[0.6deg] rounded-[18px_18px_18px_6px] border-2 border-dark px-5 pb-4 pt-5 shadow-[4px_4px_0_#1A1A1A]"
            style={{ backgroundColor: color, backgroundImage: 'repeating-linear-gradient(transparent 0 23px, rgba(26,26,26,.08) 23px 24px)' }}
          >
            <span aria-hidden="true" className="absolute -top-[9px] left-8 h-[14px] w-[46px] -rotate-6 border-x-2 border-dashed border-dark/25 bg-[#E38595]/75" />
            <p className="m-0 font-body text-[17px] font-semibold leading-[24px]" style={{ overflowWrap: 'anywhere' }}>{note.text}</p>
            <p className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[.08em] text-dark/55">
              <span>Catatan · {ago(Date.now() - note.at.getTime())}</span>
              <span>Hilang {remaining(note.at)}</span>
            </p>
          </div>
        ) : isOwn ? (
          <button
            type="button"
            onClick={onEditNote}
            className="rounded-[18px_18px_18px_6px] border-2 border-dashed border-dark bg-white p-4 text-left transition-colors hover:bg-[#FFF3C4]"
          >
            <p className="m-0 font-semibold text-maroon">+ Tulis catatan</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[.06em] text-dark/50">Otomatis hilang setelah 24 jam</p>
          </button>
        ) : null}

        {/* Statistik */}
        <div className="grid grid-cols-3 border-2 border-dark bg-white shadow-[4px_4px_0_#1A1A1A]">
          {[
            { val: member.sessions_attended, label: 'Sesi hadir' },
            { val: member.projects_count, label: 'Karya' },
            { val: member.member_since, label: 'Gabung' },
          ].map((s, i) => (
            <div key={i} className={`px-1.5 py-3 text-center ${i > 0 ? 'border-l-2 border-dashed border-dark' : ''}`}>
              <b className="block font-display text-[28px] font-black leading-none text-maroon">{s.val}</b>
              <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[.12em] text-dark/60">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Link */}
        {links.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="kg-lbl m-0">{'//'} Link</h3>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
              {links.map(({ kind, url }) => {
                const [ib, ic] = LINK_COLOR[kind];
                return (
                  <li key={kind}>
                    <a
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="group flex min-h-[54px] items-stretch border-2 border-dark bg-white text-inherit no-underline shadow-[3px_3px_0_#1A1A1A] transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#7A1B2E] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                    >
                      <span className="grid w-12 flex-none place-items-center border-r-2 border-dark" style={{ background: ib, color: ic }}>
                        {LINK_ICON[kind]}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
                        <small className="font-mono text-[10px] uppercase tracking-[.1em] text-dark/55">{LINK_LABEL[kind]}</small>
                        <b className="truncate text-[14px] font-semibold">{url.replace(/^https?:\/\//, '')}</b>
                      </span>
                      {ARROW_ICON}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Hobi */}
        {member.hobbies.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="kg-lbl m-0">{'//'} Hobi</h3>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {member.hobbies.slice(0, 8).map((t, i) => (
                <li
                  key={t}
                  className="border-2 border-dark px-3 py-1 font-mono text-[13px] font-semibold lowercase shadow-[2px_2px_0_#1A1A1A]"
                  style={{ background: TAG_BG[i % TAG_BG.length] }}
                >
                  {t}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Composer modal ───────────────────────────────────────────────────────────

function ComposerModal({
  member,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  member: Member;
  initial: string;
  onSave: (text: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const tilt = '-2deg';
  const color = BUBBLE_COLORS[0];

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    await onSave(text.trim());
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    await onDelete();
    setSaving(false);
  }

  return (
    <>
      {/* header */}
      <div className="flex-none flex items-center justify-between px-5 py-2.5 bg-paper border-b-2 border-dark">
        <span className="font-mono text-xs font-bold uppercase tracking-[.08em]">// Catatan kamu</span>
        <button
          type="button" onClick={onClose}
          className="w-11 h-11 flex items-center justify-center border-2 border-dark bg-white shadow-[3px_3px_0_#1A1A1A] hover:bg-[#F8D7DA] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" strokeWidth={3} />
        </button>
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-3">
        {/* preview */}
        <div className="flex flex-col items-center mb-1.5" aria-hidden="true">
          <div className="flex items-end justify-center w-[150px] h-14">
            {text.trim() ? (
              <BubbleShape text={text} color={color} tilt={tilt} idx={0} pop={false} />
            ) : (
              <EmptyBubble tilt={tilt} idx={0} pop={false} />
            )}
          </div>
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#FFF3C4] border-2 border-dark flex items-center justify-center -mt-3">
            <MemberAvatar m={member} sizeClass="w-full h-full" />
          </div>
        </div>

        {/* input */}
        <label className="font-mono text-xs font-bold uppercase tracking-[.08em] text-dark/70" htmlFor="c-note-input">
          Tulis catatan singkat
        </label>
        <input
          ref={inputRef}
          id="c-note-input"
          type="text"
          maxLength={MAXLEN}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="lagi ngapain?"
          className="w-full min-h-12 px-3.5 py-2.5 border-2 border-dark bg-paper font-body text-base focus:outline-none focus:shadow-[5px_5px_0_#7A1B2E] transition-shadow"
        />
        <div className="flex justify-between items-center font-mono text-[11px] text-dark/60">
          <span>Hilang otomatis setelah 24 jam</span>
          <span className={text.length >= MAXLEN ? 'text-hot font-semibold' : ''}>{text.length}/{MAXLEN}</span>
        </div>
      </div>

      {/* footer */}
      <div className="flex-none flex flex-wrap gap-2.5 justify-end px-5 py-4 bg-paper border-t-2 border-dark">
        {initial && (
          <button
            type="button" onClick={handleDelete} disabled={saving}
            className="mr-auto min-h-[38px] px-3.5 py-1 border-2 border-dark bg-white text-dark font-mono text-[12px] font-bold uppercase shadow-[3px_3px_0_#1A1A1A] hover:bg-[#F8D7DA] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Hapus
          </button>
        )}
        <button
          type="button" onClick={onClose} disabled={saving}
          className="min-h-[38px] px-3.5 py-1 border-2 border-dark bg-white text-dark font-mono text-[12px] font-bold uppercase shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-45"
        >
          Batal
        </button>
        <button
          type="button" onClick={handleSave} disabled={!text.trim() || saving}
          className="min-h-[38px] px-3.5 py-1 border-2 border-dark bg-maroon text-white font-mono text-[12px] font-bold uppercase shadow-[3px_3px_0_#1A1A1A] hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-45 disabled:cursor-not-allowed"
        >
          Bagikan
        </button>
      </div>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

// Data terakhir — strip langsung tampil saat kembali ke halaman, lalu diperbarui.
const storyCache: { members?: Member[]; ordered?: Member[]; selfId?: string | null } = {};

export function PixelStoryContainer() {
  const supabase = createClient();

  const [members, setMembers] = useState<Member[]>(storyCache.members ?? []);
  const [orderedList, setOrderedList] = useState<Member[]>(storyCache.ordered ?? []);
  const [selfId, setSelfId] = useState<string | null>(storyCache.selfId ?? null);
  const [loading, setLoading] = useState(!storyCache.members);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // modal kartu member
  const [openId, setOpenId] = useState<string | null>(null);
  // id terakhir yang dibuka — konten tetap ada selama animasi tutup
  const [shownId, setShownId] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState(0);

  // composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState('');

  // refs buat strip scroll
  const rowRef = useRef<HTMLDivElement>(null);
  const [fadeL, setFadeL] = useState(false);
  const [fadeR, setFadeR] = useState(false);

  const updateFade = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setFadeL(el.scrollLeft > 4);
    setFadeR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // lock body scroll when modal or composer is open
  useEffect(() => {
    if (!composerOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [composerOpen]);
  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setSelfId(uid);

      const { data, error } = await supabase.rpc('get_member_directory');
      if (error) throw error;

      const mapped = ((data as MemberDirectoryRow[]) || []).map(mapMember);
      const ordered = initialOrder(mapped, uid);
      Object.assign(storyCache, { members: mapped, ordered, selfId: uid });
      setMembers(mapped);
      setOrderedList(ordered);
    } catch (err) {
      console.error('PixelStory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('pixel-story-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, supabase]);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    updateFade();
    el.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);
    return () => {
      el.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', updateFade);
    };
  }, [updateFade, orderedList]);

  // nav strip
  function scrollStrip(dir: number) {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  }

  // buka kartu
  function openCard(id: string, dir = 0) {
    setSlideDir(dir);
    setOpenId(id);
    setShownId(id);
    // scroll avatar ke tengah
    setTimeout(() => {
      rowRef.current?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, 50);
  }

  function closeCard() {
    const was = openId;
    setOpenId(null);
    setTimeout(() => {
      if (was) {
        const btn = rowRef.current?.querySelector<HTMLElement>(`[data-id="${was}"]`);
        btn?.focus({ preventScroll: true });
      }
    }, 50);
  }

  function stepCard(dir: number) {
    const i = orderedList.findIndex(m => m.id === openId);
    const next = orderedList[(i + dir + orderedList.length) % orderedList.length];
    openCard(next.id, dir);
  }

  // keyboard navigasi di modal
  useEffect(() => {
    if (!openId) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stepCard(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepCard(-1); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openId, orderedList]);

  // composer
  async function openComposer() {
    if (!selfId) return;
    const me = members.find(m => m.id === selfId);
    setComposerInitial(activeNote(me!) ? me!.chat_status! : '');
    setComposerOpen(true);
  }

  async function saveNote(text: string) {
    if (!selfId) return;
    const { error } = await supabase
      .from('profiles')
      .update({ chat_status: text, chat_status_at: new Date().toISOString() })
      .eq('id', selfId);
    if (error) { alert('Gagal menyimpan: ' + error.message); return; }
    await load();
    setComposerOpen(false);
  }

  async function deleteNote() {
    if (!selfId) return;
    const { error } = await supabase
      .from('profiles')
      .update({ chat_status: null, chat_status_at: null })
      .eq('id', selfId);
    if (error) { alert('Gagal menghapus: ' + error.message); return; }
    await load();
    setComposerOpen(false);
  }

  // mask gradient kiri/kanan strip
  const maskStyle: React.CSSProperties = (() => {
    if (fadeL && fadeR) return { maskImage: 'linear-gradient(90deg,transparent,#000 44px,#000 calc(100% - 44px),transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 44px,#000 calc(100% - 44px),transparent)' };
    if (fadeL) return { maskImage: 'linear-gradient(90deg,transparent,#000 44px)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 44px)' };
    if (fadeR) return { maskImage: 'linear-gradient(90deg,#000 calc(100% - 44px),transparent)', WebkitMaskImage: 'linear-gradient(90deg,#000 calc(100% - 44px),transparent)' };
    return {};
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 border-2 border-dark bg-white shadow-[4px_4px_0_#1A1A1A]">
        <Loader2 className="w-5 h-5 animate-spin text-maroon mr-2" />
        <span className="font-mono text-xs uppercase">// Memuat Pixel Story...</span>
      </div>
    );
  }

  if (orderedList.length === 0) return null;

  const openMember = orderedList.find(m => m.id === openId);
  const shownMember = orderedList.find(m => m.id === shownId);
  const openIdx = Math.max(0, orderedList.findIndex(m => m.id === shownId));
  const selfMember = members.find(m => m.id === selfId);

  return (
    <>
      {/* ── Strip ── */}
      <section
        className="bg-[#FFFDF7] border-[3px] border-dark shadow-[6px_6px_0_#7A1B2E]"
        aria-labelledby="ps-title"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b-[3px] border-dark bg-[#FFF3C4] px-4 py-2 font-mono text-xs font-medium uppercase tracking-[.08em]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-maroon" />
            <h2 id="ps-title" className="m-0 font-display text-sm font-black text-dark">
              Pixel Story <span className="text-maroon">&amp;</span> Status Anggota
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-dark/65 hidden sm:block">
              // ketuk avatar buat lihat kartu member
            </span>
            {/* nav panah — desktop only */}
            <div className="hidden gap-1.5 sm:flex" aria-hidden="true">
              <button
                type="button"
                onClick={() => scrollStrip(-1)}
                className="w-7 h-7 grid place-items-center border-2 border-dark bg-white shadow-[2px_2px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                tabIndex={-1}
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={() => scrollStrip(1)}
                className="w-7 h-7 grid place-items-center border-2 border-dark bg-white shadow-[2px_2px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                tabIndex={-1}
              >
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* scroll row */}
        <div style={maskStyle}>
          <div
            ref={rowRef}
            className="flex gap-2.5 px-5 pt-2.5 pb-4 overflow-x-auto ps-scroll"
            style={{ scrollSnapType: 'x proximity', overscrollBehaviorX: 'contain' }}
            aria-label="Catatan anggota"
          >
            {orderedList.map((member, idx) => (
              <StoryItem
                key={member.id}
                member={member}
                idx={idx}
                isOwn={member.id === selfId}
                isSelected={member.id === openId}
                popAll={true}
                onClickAvatar={() => openCard(member.id)}
                onClickBubble={() => openComposer()}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Panel kartu member (geser dari kiri) ── */}
      <SideSheet
        open={!!openMember}
        onClose={closeCard}
        width="sm:w-[min(540px,92vw)]"
        label={<>{'//'} Member card <span className="ml-1 text-dark/50">{pad(openIdx + 1)}/{pad(orderedList.length)}</span></>}
        actions={
          <>
            <SheetButton onClick={() => stepCard(-1)} label="Profil sebelumnya">
              <ChevronLeft className="h-4 w-4" strokeWidth={3} />
            </SheetButton>
            <SheetButton onClick={() => stepCard(1)} label="Profil berikutnya">
              <ChevronRight className="h-4 w-4" strokeWidth={3} />
            </SheetButton>
          </>
        }
        footer={
          shownMember && shownMember.id === selfId ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => { closeCard(); setTimeout(openComposer, 380); }}
                className="inline-flex min-h-11 flex-1 items-center justify-center border-2 border-dark bg-maroon px-4 font-display text-[13px] font-extrabold uppercase tracking-[.05em] text-white shadow-[3px_3px_0_#1A1A1A] transition-all hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                {activeNote(shownMember) ? 'Ubah catatan' : 'Tulis catatan'}
              </button>
              <a
                href="/profil"
                className="inline-flex min-h-11 flex-1 items-center justify-center border-2 border-dark bg-white px-4 font-display text-[13px] font-extrabold uppercase tracking-[.05em] text-dark no-underline shadow-[3px_3px_0_#7A1B2E] transition-all hover:bg-paper active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                Atur profil
              </a>
            </div>
          ) : undefined
        }
      >
        {shownMember && (
          <AnimatePresence mode="popLayout" initial={false} custom={slideDir}>
            <motion.div
              key={shownMember.id}
              custom={slideDir}
              variants={{
                enter: (d: number) => ({ x: d === 0 ? 0 : d > 0 ? 60 : -60, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d === 0 ? 0 : d > 0 ? -60 : 60, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={GLIDE}
            >
              <MemberCard
                member={shownMember}
                allMembers={orderedList}
                selfId={selfId}
                onEditNote={() => { closeCard(); setTimeout(openComposer, 380); }}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </SideSheet>

      {/* ── Composer catatan ── */}
      {mounted && composerOpen && selfMember && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3"
          style={{ background: 'rgba(26,26,26,.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          onClick={() => setComposerOpen(false)}
        >
          <div
            className="flex flex-col bg-white border-2 border-dark w-full max-w-[440px]"
            style={{ maxHeight: 'min(92vh,700px)', boxShadow: '8px 8px 0 #7A1B2E' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <ComposerModal
              member={selfMember}
              initial={composerInitial}
              onSave={saveNote}
              onDelete={deleteNote}
              onClose={() => setComposerOpen(false)}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
