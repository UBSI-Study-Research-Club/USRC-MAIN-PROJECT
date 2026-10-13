'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PixelCharacterLayer } from '../PixelCharacterLayer';
import { MessageSquare, Sparkles, Loader2 } from 'lucide-react';

interface MemberPixelData {
  id: string;
  name: string;
  pixel_body?: string;
  pixel_hair?: string;
  pixel_face?: string;
  pixel_clothing?: string;
  pixel_accessories?: string;
  chat_status?: string;
}

const CLOTHING_MAP: Record<string, string> = {
  hoodie: 'clothing-hoodie-usrc',
  casual: 'clothing-shirt-casual',
  tshirt: 'clothing-tshirt-plain',
  jacket: 'clothing-jacket-bomber',
};
const ACCESSORY_MAP: Record<string, string> = {
  cap: 'aksesori-1-beanie',
  glasses: 'aksesori-2-sunglasses',
  headband: 'aksesori-3-headband',
  headset: 'aksesori-4-headset',
};
const FACE_FALLBACK: Record<string, string> = { neutral: 'normal', wink: 'smile' };

const pref = (prefix: string, v?: string) => (v && v.includes(prefix) ? v : `${prefix}-${v}`);

export function PixelStoryContainer() {
  const [members, setMembers] = useState<MemberPixelData[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, pixel_body, pixel_hair, pixel_face, pixel_clothing, pixel_accessories, chat_status')
          .eq('status', 'aktif')
          .limit(12);

        if (error) throw error;

        const mappedData = (data || []).map(member => ({
          id: member.id,
          name: member.full_name || 'Anggota',
          pixel_body: member.pixel_body || 'medium',
          pixel_hair: pref('hair', member.pixel_hair || 'short'),
          pixel_face: pref('face', FACE_FALLBACK[member.pixel_face || ''] || member.pixel_face || 'normal'),
          pixel_clothing: CLOTHING_MAP[member.pixel_clothing || ''] || pref('clothing', member.pixel_clothing || 'hoodie'),
          pixel_accessories: member.pixel_accessories && member.pixel_accessories !== 'none'
            ? (ACCESSORY_MAP[member.pixel_accessories] || pref('aksesori', member.pixel_accessories))
            : undefined,
          chat_status: member.chat_status || null,
        }));

        setMembers(mappedData);
        if (mappedData.length > 0) {
          setSelectedMemberId(mappedData[0].id);
        }
      } catch (err) {
        console.error('Error fetching pixel story members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [supabase]);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 border-2 border-dark bg-white shadow-[4px_4px_0_#1A1A1A]">
        <Loader2 className="w-5 h-5 animate-spin text-maroon mr-2" />
        <span className="font-mono text-xs uppercase">// Memuat Pixel Story...</span>
      </div>
    );
  }

  if (members.length === 0) return null;

  return (
    <div className="border-2 border-dark bg-white p-4 md:p-6 shadow-[5px_5px_0_#1A1A1A]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-maroon" />
          <h2 className="font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-widest text-dark">
            // Pixel Story &amp; Status Anggota
          </h2>
        </div>
        <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] text-dark/50">
          Klik avatar untuk lihat pesan
        </span>
      </div>

      {/* Story Bubbles Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin">
        {members.map(member => {
          const isSelected = selectedMemberId === member.id;
          return (
            <button
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              className="group flex flex-col items-center shrink-0 cursor-pointer focus:outline-none"
            >
              <div
                className={`relative p-1 transition-all rounded-full border-2 ${
                  isSelected
                    ? "border-maroon bg-[#FFF3C4] shadow-[3px_3px_0_#1A1A1A] scale-105"
                    : "border-dark bg-paper hover:bg-white"
                }`}
              >
                <PixelCharacterLayer
                  bodyColor={member.pixel_body}
                  hairStyle={member.pixel_hair}
                  faceExpression={member.pixel_face}
                  clothingType={member.pixel_clothing}
                  accessoryHead={member.pixel_accessories}
                  size={52}
                />
                {member.chat_status && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-maroon border-2 border-dark rounded-full animate-pulse" />
                )}
              </div>
              <span className="mt-2 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-bold uppercase tracking-tight text-dark truncate max-w-[70px]">
                {member.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Chat Box / Speech Bubble */}
      {selectedMember && (
        <div className="mt-4 relative border-2 border-dark bg-[#FFF9DC] p-4 shadow-[4px_4px_0_#1A1A1A]">
          {/* Triangle Pointer */}
          <div className="absolute -top-3 left-8 w-4 h-4 bg-[#FFF9DC] border-l-2 border-t-2 border-dark rotate-45" />

          <div className="flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-maroon shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-[family-name:var(--font-outfit)] text-xs font-black uppercase text-dark">
                  @{selectedMember.name}
                </span>
                <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] text-dark/60">
                  status aktif
                </span>
              </div>
              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-xs text-dark/80 leading-relaxed italic">
                {selectedMember.chat_status ? (
                  <>&ldquo;{selectedMember.chat_status}&rdquo;</>
                ) : (
                  <span className="text-dark/40 not-italic">// Belum memasang status chat.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
