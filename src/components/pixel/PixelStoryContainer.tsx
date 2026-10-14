'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PixelCharacter, type PixelCharacterConfig } from './PixelCharacter';
import { Sparkles, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';

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

function BubbleShape({
  text, color, tilt, idx, pop,
}: {
  text: string; color: string; tilt: string; idx: number; pop: boolean;
}) {
  return (
    <span
      className={`relative inline-block max-w-full min-w-[46px] px-[9px] py-[6px] border-2 border-dark${pop ? ' ps-bubble-pop' : ''}`}
      style={{
        background: color,
        transform: `rotate(${tilt})`,
        boxShadow: '2px 2px 0 #1A1A1A',
        // @ts-expect-error css var
        '--tilt': tilt,
        '--i': idx,
      }}
    >
      <span className="block overflow-hidden font-body text-[11.5px] font-medium leading-[1.3] text-center" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden', overflowWrap: 'anywhere' }}>
        {text}
      </span>
      {/* ekor bubble */}
      <span
        className="absolute left-1/2 -bottom-[7px] w-[11px] h-[11px] border-r-2 border-b-2 border-dark"
        style={{ background: color, transform: 'translateX(-50%) rotate(45deg)' }}
      />
    </span>
  );
}

function EmptyBubble({ tilt, idx, pop }: { tilt: string; idx: number; pop: boolean }) {
  return (
    <span
      className={`relative inline-block max-w-full min-w-[46px] px-[9px] py-[6px] border-2 border-dashed border-dark bg-white${pop ? ' ps-bubble-pop' : ''}`}
      style={{ transform: `rotate(${tilt})`, '--tilt': tilt, '--i': idx } as React.CSSProperties}
    >
      <span className="block text-[11.5px] font-semibold leading-[1.3] text-center text-maroon" style={{ overflowWrap: 'anywhere' }}>
        + catatan
      </span>
      <span
        className="absolute left-1/2 -bottom-[7px] w-[11px] h-[11px] border-r-2 border-b-2 border-dashed border-dark bg-white"
        style={{ transform: 'translateX(-50%) rotate(45deg)' }}
      />
    </span>
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
    <li className="flex-none" style={{ scrollSnapAlign: 'center' }}>
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
          className={`relative z-[1] w-[72px] h-[72px] -mt-3 rounded-full overflow-hidden flex items-center justify-center transition-all duration-100
            ${isNew ? 'border-2 border-maroon shadow-[3px_3px_0_#7A1B2E]' : 'border-2 border-dark bg-paper'}
            ${isSelected ? 'bg-[#FFF3C4] border-maroon shadow-[3px_3px_0_#7A1B2E]' : ''}
            group-hover:-translate-y-0.5
          `}
        >
          <PixelCharacter config={member.pixel_config} />
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
  onPrev,
  onNext,
  onClose,
  onEditNote,
  slideDir,
}: {
  member: Member;
  allMembers: Member[];
  selfId: string | null;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onEditNote: () => void;
  slideDir: number;
}) {
  const note = activeNote(member);
  const idx = allMembers.findIndex(m => m.id === member.id);
  const total = allMembers.length;
  const isOwn = member.id === selfId;
  const color = BUBBLE_COLORS[idx % BUBBLE_COLORS.length];
  const wmText = Array(12).fill(`@${member.full_name.split(' ')[0].toUpperCase()} ✦ `).join('');
  const shirtColor = (() => {
    const c = { hoodie: '#2E5090', casual: '#4A90E2', tshirt: '#FF6B6B', jacket: '#34495E' };
    return c[member.pixel_config.clothing || 'hoodie'];
  })();

  // link cards
  const links: { kind: LinkKind; url: string }[] = (
    ['instagram', 'github', 'behance', 'linkedin'] as LinkKind[]
  ).filter(k => !!member[k]).map(k => ({ kind: k, url: member[k as keyof Member] as string }));

  const slideClass = slideDir > 0 ? 'ps-slide-r' : slideDir < 0 ? 'ps-slide-l' : '';

  return (
    <>
      {/* modal header */}
      <div className="flex-none flex items-center gap-2.5 px-5 py-2.5 bg-paper border-b-2 border-dark">
        <span className="mr-auto font-mono text-xs font-semibold uppercase tracking-[.08em]">// Member card</span>
        <span className="font-mono text-xs text-dark/60">{pad(idx + 1)}/{pad(total)}</span>
        <button
          type="button" onClick={onPrev}
          className="w-11 h-11 flex items-center justify-center border-2 border-dark bg-white shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          aria-label="Profil sebelumnya"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={3} />
        </button>
        <button
          type="button" onClick={onNext}
          className="w-11 h-11 flex items-center justify-center border-2 border-dark bg-white shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          aria-label="Profil berikutnya"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={3} />
        </button>
        <button
          type="button" onClick={onClose}
          className="w-11 h-11 flex items-center justify-center border-2 border-dark bg-white shadow-[3px_3px_0_#1A1A1A] hover:bg-[#F8D7DA] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          aria-label="Tutup profil"
        >
          <X className="w-5 h-5" strokeWidth={3} />
        </button>
      </div>

      {/* scrollable body */}
      <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${slideClass}`} tabIndex={-1}>
        {/* Hero */}
        <div
          className="relative flex-none h-[150px] overflow-hidden border-b-2 border-dark"
          style={{
            backgroundColor: shirtColor,
            backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,.32) 1.6px,transparent 0),repeating-linear-gradient(135deg,rgba(26,26,26,.15) 0 2px,transparent 2px 16px)',
            backgroundSize: '14px 14px, auto',
          }}
        >
          {/* watermark berjalan */}
          <span className="absolute left-[-6px] bottom-[-22px] whitespace-nowrap" style={{ transform: 'rotate(-5deg)', transformOrigin: 'left bottom' }}>
            <span
              className="font-display font-black text-transparent ps-drift"
              style={{ fontSize: 'clamp(78px,17vw,112px)', lineHeight: 1, letterSpacing: '.02em', WebkitTextStroke: '2px rgba(255,255,255,.55)' }}
            >
              {wmText}
            </span>
          </span>
          {/* glass chip kiri atas */}
          <span
            className="absolute z-[2] top-[14px] left-[16px] px-[11px] py-[5px] font-mono text-[11px] font-semibold tracking-[.08em]"
            style={{ transform: 'rotate(-3deg)', background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.4)', outline: '1.5px solid #1A1A1A' }}
          >
            NO. {pad(idx + 1)} // {member.member_since}
          </span>
          {/* stamp role kanan atas */}
          <span
            className="absolute z-[2] top-[14px] right-[16px] px-[13px] py-[3px] bg-[#FFF3C4] border-2 border-dark font-display font-extrabold text-[13px] uppercase tracking-[.16em] shadow-[3px_3px_0_#1A1A1A]"
            style={{ transform: 'rotate(4deg)' }}
          >
            {member.role}
          </span>
        </div>

        {/* Body */}
        <div className="relative px-7 pb-7 flex flex-col gap-[26px]" style={{ '--pad': '28px', '--pp': '128px' } as React.CSSProperties}>
          {/* avatar besar — menonjol ke atas hero */}
          <div className="relative z-[3] w-32 h-32 -mt-16">
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[#FFF3C4] border-4 border-dark shadow-[6px_6px_0_#7A1B2E] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-3">
              <PixelCharacter config={{ ...member.pixel_config, size: 'xl' }} />
              {/* sheen sekali */}
              <span className="absolute inset-0 ps-sheen pointer-events-none" style={{ background: 'linear-gradient(115deg,transparent 35%,rgba(255,255,255,.7) 50%,transparent 65%)', transform: 'translateX(-130%)' }} />
            </div>
          </div>

          {/* catatan speech bubble */}
          {note && (
            <aside
              className="absolute z-[4] ps-note-pop border-2 border-dark"
              style={{
                left: 'calc(28px + 128px + 22px)',
                top: 'calc(128px / -2 + 6px)',
                maxWidth: 'calc(100% - 128px - 28px - 22px - 28px)',
                padding: '11px 15px 10px',
                background: color,
                boxShadow: '4px 4px 0 #1A1A1A',
                transform: 'rotate(1.6deg)',
              }}
              aria-label="Catatan terbaru"
            >
              {/* ekor kiri */}
              <span
                className="absolute -left-[9px] bottom-4 w-[14px] h-[14px] border-l-2 border-b-2 border-dark"
                style={{ background: color, transform: 'rotate(45deg)' }}
              />
              <p className="m-0 font-body text-[15px] leading-[1.4]" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 4, overflow: 'hidden', overflowWrap: 'anywhere' }}>
                {note.text}
              </p>
              <small className="block mt-1.5 font-mono text-[10px] uppercase tracking-[.06em] text-dark/60">
                {ago(Date.now() - note.at.getTime())} · hilang dalam {remaining(note.at)}
              </small>
            </aside>
          )}
          {!note && isOwn && (
            <button
              type="button"
              onClick={onEditNote}
              className="absolute z-[4] ps-note-pop border-2 border-dashed border-dark bg-white text-left cursor-pointer hover:bg-[#FFF3C4] transition-colors"
              style={{
                left: 'calc(28px + 128px + 22px)',
                top: 'calc(128px / -2 + 6px)',
                maxWidth: 'calc(100% - 128px - 28px - 22px - 28px)',
                padding: '11px 15px 10px',
                transform: 'rotate(1.6deg)',
              }}
            >
              <span className="absolute -left-[9px] bottom-4 w-[14px] h-[14px] border-l-2 border-b-2 border-dashed border-dark bg-white" style={{ transform: 'rotate(45deg)' }} />
              <p className="m-0 font-body text-[15px] leading-[1.4] text-maroon font-semibold">+ tulis catatan</p>
              <small className="block mt-1.5 font-mono text-[10px] uppercase tracking-[.06em] text-dark/60">hilang otomatis 24 jam</small>
            </button>
          )}

          {/* identitas */}
          <div className="-mt-0.5">
            <h2 className="m-0 font-display font-black uppercase leading-[1.14]" style={{ fontSize: 'clamp(30px,6vw,44px)', letterSpacing: '.01em', overflowWrap: 'anywhere' }}>
              <span
                className="ps-name-hl"
                style={{
                  background: 'linear-gradient(transparent 58%, #E38595 58% 92%, transparent 92%)',
                  WebkitBoxDecorationBreak: 'clone',
                  padding: '0 8px',
                  marginLeft: '-8px',
                } as React.CSSProperties}
              >
                {member.full_name}
              </span>
            </h2>
            <div className="mt-2 font-mono text-[12px] tracking-[.04em] text-dark/70">
              @{member.full_name.split(' ')[0].toLowerCase()} · {member.prodi}
            </div>
            {member.about ? (
              <p className="mt-[14px] text-[16px] leading-[1.6] whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>{member.about}</p>
            ) : (
              <p className="mt-[14px] font-mono text-[13px] text-dark/55">// {isOwn ? 'Kamu belum nulis about me.' : 'Belum nulis about me.'}</p>
            )}
          </div>

          {/* statistik tiket */}
          <div className="grid grid-cols-3 bg-white border-2 border-dark shadow-[4px_4px_0_#1A1A1A]">
            {[
              { val: member.sessions_attended, label: 'Sesi hadir' },
              { val: member.projects_count, label: 'Karya' },
              { val: member.member_since, label: 'Gabung' },
            ].map((s, i) => (
              <div key={i} className={`px-1.5 pt-3 pb-2.5 text-center ${i > 0 ? 'border-l-2 border-dashed border-dark' : ''}`}>
                <b className="block font-display font-black text-[30px] leading-none text-maroon">{s.val}</b>
                <span className="block mt-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-dark/60">{s.label}</span>
              </div>
            ))}
          </div>

          {/* link cards */}
          {links.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="m-0 font-mono text-[12px] font-semibold uppercase tracking-[.14em] text-maroon">// Link</h3>
              <ul className="m-0 p-0 list-none grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
                {links.map(({ kind, url }) => {
                  const [ib, ic] = LINK_COLOR[kind];
                  return (
                    <li key={kind}>
                      <a
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="group flex items-stretch min-h-[58px] text-inherit no-underline bg-white border-2 border-dark shadow-[3px_3px_0_#1A1A1A] transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#7A1B2E] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                        style={{ background: 'white' }}
                      >
                        <span className="flex-none w-14 grid place-items-center border-r-2 border-dark" style={{ background: ib, color: ic }}>
                          {LINK_ICON[kind]}
                        </span>
                        <span className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center">
                          <small className="font-mono text-[10px] uppercase tracking-[.1em] text-dark/55">{LINK_LABEL[kind]}</small>
                          <b className="text-[14px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{url.replace(/^https?:\/\//, '')}</b>
                        </span>
                        {ARROW_ICON}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* tag gantung */}
          {member.hobbies.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="m-0 font-mono text-[12px] font-semibold uppercase tracking-[.14em] text-maroon">// Tag</h3>
              <ul className="m-0 p-0 list-none flex flex-wrap gap-x-4 gap-y-3.5">
                {member.hobbies.slice(0, 6).map((t, i) => (
                  <li
                    key={t}
                    className="ps-tagw"
                    style={{
                      filter: 'drop-shadow(2px 2px 0 #1A1A1A)',
                      transform: `rotate(${i % 2 ? '1.2deg' : '-1.2deg'})`,
                      transformOrigin: '18px 50%',
                      // @ts-expect-error css var
                      '--r': `${i % 2 ? '1.2deg' : '-1.2deg'}`,
                    }}
                  >
                    {/* bentuk tag gantung */}
                    <span
                      className="relative inline-flex items-center py-[7px] pr-4 pl-8"
                      style={{
                        background: '#1A1A1A',
                        clipPath: 'polygon(14px 0,100% 0,100% 100%,0 100%,0 14px)',
                      }}
                    >
                      <span
                        className="absolute inset-[2px]"
                        style={{
                          background: TAG_BG[i % TAG_BG.length],
                          clipPath: 'polygon(12px 0,100% 0,100% 100%,0 100%,0 12px)',
                        }}
                      />
                      {/* lubang tag */}
                      <span className="absolute left-[13px] top-1/2 w-[11px] h-[11px] -mt-[5.5px] rounded-full bg-paper border-2 border-dark" />
                      <span className="relative font-mono text-[13px] font-semibold lowercase">{t}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* barcode footer */}
          <div className="flex flex-col gap-1.5 mt-1">
            <span
              className="block h-[34px]"
              style={{ background: 'repeating-linear-gradient(90deg,#1A1A1A 0 2px,transparent 2px 5px,#1A1A1A 5px 6px,transparent 6px 10px,#1A1A1A 10px 13px,transparent 13px 15px,#1A1A1A 15px 16px,transparent 16px 20px)' }}
            />
            <span className="font-mono text-[10px] font-medium tracking-[.24em] uppercase text-center text-dark/70">
              USRC · member card · no. {pad(idx + 1)}
            </span>
          </div>
        </div>
      </div>

      {/* footer — hanya untuk diri sendiri */}
      {isOwn && (
        <div className="flex-none flex flex-wrap gap-3 px-5 py-3.5 bg-paper border-t-2 border-dark">
          <button
            type="button" onClick={onEditNote}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-[18px] py-2 cursor-pointer font-display font-extrabold text-[13px] uppercase tracking-[.05em] bg-maroon text-white border-2 border-dark shadow-[3px_3px_0_#1A1A1A] hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          >
            {note ? 'Ubah catatan' : 'Tulis catatan'}
          </button>
          <a
            href="/profil"
            className="inline-flex items-center justify-center gap-2 min-h-11 px-[18px] py-2 font-display font-extrabold text-[13px] uppercase tracking-[.05em] bg-white text-dark border-2 border-dark shadow-[3px_3px_0_#7A1B2E] hover:bg-paper active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all no-underline"
          >
            Atur profil
          </a>
        </div>
      )}
    </>
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
            <PixelCharacter config={member.pixel_config} />
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

export function PixelStoryContainer() {
  const supabase = createClient();

  const [members, setMembers] = useState<Member[]>([]);
  const [orderedList, setOrderedList] = useState<Member[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // modal kartu member
  const [openId, setOpenId] = useState<string | null>(null);
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
    if (openId || composerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [openId, composerOpen]);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setSelfId(uid);

      const { data, error } = await supabase.rpc('get_member_directory');
      if (error) throw error;

      const mapped = ((data as MemberDirectoryRow[]) || []).map(mapMember);
      setMembers(mapped);
      setOrderedList(initialOrder(mapped, uid));
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
      if (e.key === 'Escape') closeCard();
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
  const selfMember = members.find(m => m.id === selfId);

  return (
    <>
      {/* ── Strip ── */}
      <section
        className="bg-white border-2 border-dark shadow-[5px_5px_0_#1A1A1A]"
        aria-labelledby="ps-title"
      >
        {/* header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-0">
          <Sparkles className="w-5 h-5 text-maroon flex-none" />
          <h2 id="ps-title" className="m-0 font-mono text-xs font-bold uppercase tracking-[.14em]">
            // Pixel story &amp; status anggota
          </h2>
          <span className="ml-auto font-mono text-[12px] text-dark/55 hidden sm:block">
            Ketuk avatar buat lihat kartu member
          </span>
          {/* nav panah — desktop only */}
          <div className="flex gap-2 sm:flex" aria-hidden="true">
            <button
              type="button"
              onClick={() => scrollStrip(-1)}
              className="w-9 h-9 grid place-items-center border-2 border-dark bg-white shadow-[2px_2px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              tabIndex={-1}
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => scrollStrip(1)}
              className="w-9 h-9 grid place-items-center border-2 border-dark bg-white shadow-[2px_2px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              tabIndex={-1}
            >
              <ChevronRight className="w-4 h-4" strokeWidth={3} />
            </button>
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

      {/* ── Modal kartu member ── */}
      {openMember && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3"
          style={{ background: 'rgba(26,26,26,.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={closeCard}
        >
          <div
            className="ps-modal-pop flex flex-col bg-white border-2 border-dark overflow-hidden w-full max-w-[620px]"
            style={{ maxHeight: 'min(92vh, 860px)', boxShadow: '8px 8px 0 #7A1B2E' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ps-card-title"
          >
            <MemberCard
              member={openMember}
              allMembers={orderedList}
              selfId={selfId}
              onPrev={() => stepCard(-1)}
              onNext={() => stepCard(1)}
              onClose={closeCard}
              onEditNote={() => { closeCard(); setTimeout(openComposer, 80); }}
              slideDir={slideDir}
            />
          </div>
        </div>
      )}

      {/* ── Composer catatan ── */}
      {composerOpen && selfMember && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3"
          style={{ background: 'rgba(26,26,26,.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
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
        </div>
      )}
    </>
  );
}
