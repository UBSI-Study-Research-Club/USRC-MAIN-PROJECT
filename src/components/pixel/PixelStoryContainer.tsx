'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PixelCharacter, type PixelCharacterConfig } from './PixelCharacter';
import { Sparkles, Loader2, X } from 'lucide-react';

interface MemberDirectoryRow {
  id: string;
  full_name: string | null;
  pixel_body?: string | null;
  pixel_hair?: string | null;
  pixel_hair_color?: string | null;
  pixel_face?: string | null;
  pixel_clothing?: string | null;
  pixel_accessories?: string | null;
  chat_status?: string | null;
}

interface MemberPixelData {
  id: string;
  full_name: string;
  pixel_config: PixelCharacterConfig;
  chat_status?: string | null;
}

const COLORS = ['#FFF3C4', '#FCE9ED', '#D1E7DD', '#FFFFFF'];

function mapPixelConfig(member: MemberDirectoryRow): PixelCharacterConfig {
  const hairColorMap: Record<string, NonNullable<PixelCharacterConfig['hair']>['color']> = {
    hitam: 'black',
    black: 'black',
    coklat: 'brown',
    brown: 'brown',
    pirang: 'blonde',
    blonde: 'blonde',
    merah: 'red',
    red: 'red',
  };
  const faceMap: Record<string, PixelCharacterConfig['face']> = {
    normal: 'neutral',
    neutral: 'neutral',
    smile: 'smile',
    wink: 'wink',
    focus: 'focus',
  };
  const clothingMap: Record<string, PixelCharacterConfig['clothing']> = {
    'hoodie-usrc': 'hoodie',
    hoodie: 'hoodie',
    casual: 'casual',
    tshirt: 'tshirt',
    jacket: 'jacket',
  };
  const accessoryMap: Record<string, PixelCharacterConfig['accessory']> = {
    none: 'none',
    cap: 'cap',
    glasses: 'glasses',
    headset: 'headset',
    headband: 'headband',
  };

  return {
    skin: (member.pixel_body as PixelCharacterConfig['skin']) || 'medium',
    hair: {
      style: (member.pixel_hair as any) || 'short',
      color: hairColorMap[member.pixel_hair_color || ''] || 'black',
    },
    face: faceMap[member.pixel_face || ''] || 'neutral',
    clothing: clothingMap[member.pixel_clothing || ''] || 'hoodie',
    accessory: accessoryMap[member.pixel_accessories || ''] || 'none',
  };
}

export function PixelStoryContainer() {
  const [members, setMembers] = useState<MemberPixelData[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');

  const supabase = createClient();

  // Fetch current user + all members
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);

        // RLS-safe: get all active members via existing RPC
        const { data, error } = await supabase.rpc('get_member_directory');

        if (error) throw error;

        const mapped = ((data as MemberDirectoryRow[]) || []).map(m => ({
          id: m.id,
          full_name: m.full_name || 'Anggota',
          pixel_config: mapPixelConfig(m),
          chat_status: m.chat_status || null,
        }));

        setMembers(mapped);
      } catch (err) {
        console.error('Error fetching pixel story members:', err);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Realtime
    const channel = supabase
      .channel('pixel-story-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Load current user's catatan when composer opens
  const openComposer = async () => {
    if (!currentUserId) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('chat_status')
        .eq('id', currentUserId)
        .single();

      setComposerText(data?.chat_status || '');
      setComposerOpen(true);
    } catch (err) {
      console.error('Error loading catatan:', err);
    }
  };

  const saveComposer = async () => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ chat_status: composerText.trim() || null })
        .eq('id', currentUserId);

      if (error) throw error;

      // Update local state
      setMembers(prev => prev.map(m =>
        m.id === currentUserId
          ? { ...m, chat_status: composerText.trim() || null }
          : m
      ));

      setComposerOpen(false);
      setComposerText('');
    } catch (err) {
      alert('Gagal menyimpan catatan: ' + (err as any).message);
    }
  };

  const deleteComposer = async () => {
    if (!currentUserId || !confirm('Hapus catatan kamu?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ chat_status: null })
        .eq('id', currentUserId);

      if (error) throw error;

      setMembers(prev => prev.map(m =>
        m.id === currentUserId ? { ...m, chat_status: null } : m
      ));

      setComposerOpen(false);
      setComposerText('');
    } catch (err) {
      alert('Gagal menghapus catatan: ' + (err as any).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 border-2 border-dark bg-white shadow-[4px_4px_0_#1A1A1A]">
        <Loader2 className="w-5 h-5 animate-spin text-maroon mr-2" />
        <span className="font-mono text-xs uppercase">// Memuat Pixel Story...</span>
      </div>
    );
  }

  if (members.length === 0) return null;

  const currentUser = members.find(m => m.id === currentUserId);

  return (
    <>
      <div className="border-2 border-dark bg-white p-4 md:p-6 shadow-[5px_5px_0_#1A1A1A]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-maroon" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-dark">
              // Pixel story &amp; status anggota
            </h2>
          </div>
          <span className="font-mono text-[10px] text-dark/50">
            Ketuk avatar kamu untuk edit catatan
          </span>
        </div>

        {/* Horizontal scroll row */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-min px-1">
            {members.map((member, idx) => {
              const isOwn = member.id === currentUserId;
              const bubbleColor = COLORS[idx % COLORS.length];

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => isOwn && openComposer()}
                  disabled={!isOwn}
                  className={`group flex flex-col items-center shrink-0 focus:outline-none transition-all ${
                    isOwn ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Bubble preview */}
                  {member.chat_status && (
                    <div
                      className="relative mb-2 px-3 py-1.5 rounded-lg border-2 border-dark text-center"
                      style={{ backgroundColor: bubbleColor }}
                    >
                      <p className="font-sans text-[10px] font-medium max-w-[80px] line-clamp-2">
                        {member.chat_status}
                      </p>
                      <div
                        className="absolute left-1/2 -bottom-2 w-3 h-3 border-r-2 border-b-2 border-dark"
                        style={{
                          transform: 'translateX(-50%) rotate(45deg)',
                          backgroundColor: bubbleColor
                        }}
                      />
                    </div>
                  )}

                  {/* Avatar */}
                  <div
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all ${
                      isOwn
                        ? 'border-maroon bg-[#FFF3C4] shadow-[3px_3px_0_#1A1A1A] group-hover:shadow-[4px_4px_0_#1A1A1A]'
                        : 'border-dark bg-paper'
                    }`}
                  >
                    <PixelCharacter config={member.pixel_config || {}} />
                  </div>

                  {/* Name */}
                  <span className="mt-2 font-mono text-[11px] font-bold uppercase tracking-tight text-dark truncate max-w-[100px]">
                    {member.full_name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Composer Modal */}
      {composerOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-dark/50 backdrop-blur-sm">
          <div className="border-2 border-dark bg-white shadow-[8px_8px_0_#7A1B2E] w-full max-w-sm mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#F5F3EF] border-b-2 border-dark">
              <span className="font-mono text-xs font-bold uppercase text-dark">
                // Catatan kamu
              </span>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="w-10 h-10 flex items-center justify-center border-2 border-dark bg-white shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Avatar preview */}
              {currentUser && (
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 rounded-full border-2 border-dark bg-paper flex items-center justify-center">
                    <PixelCharacter config={currentUser.pixel_config || {}} />
                  </div>
                </div>
              )}

              {/* Input */}
              <div>
                <label className="font-mono text-xs font-bold uppercase text-dark/70 block mb-2">
                  Tulis catatan singkat
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={composerText}
                  onChange={e => setComposerText(e.target.value)}
                  placeholder="lagi ngapain?"
                  className="w-full min-h-12 px-3 py-2 border-2 border-dark bg-[#F5F3EF] font-sans text-sm focus:outline-none focus:shadow-[4px_4px_0_#7A1B2E] transition-shadow"
                />
                <div className="mt-1 flex justify-between items-center">
                  <span className="font-mono text-[10px] text-dark/50">
                    Catatan tampil di Pixel Story
                  </span>
                  <span className="font-mono text-[10px] text-dark/60">
                    {composerText.length}/60
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end p-4 bg-white border-t-2 border-dark">
              {composerText && (
                <button
                  type="button"
                  onClick={deleteComposer}
                  className="px-4 py-2 border-2 border-dark bg-white text-dark font-mono text-xs font-bold uppercase shadow-[3px_3px_0_#1A1A1A] hover:bg-[#F8D7DA] transition-colors"
                >
                  Hapus
                </button>
              )}
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="px-4 py-2 border-2 border-dark bg-white text-dark font-mono text-xs font-bold uppercase shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveComposer}
                disabled={!composerText.trim()}
                className="px-4 py-2 border-2 border-dark bg-maroon text-white font-mono text-xs font-bold uppercase shadow-[3px_3px_0_#1A1A1A] hover:bg-[#A62639] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bagikan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
