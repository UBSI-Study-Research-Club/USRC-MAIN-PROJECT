'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PixelCharacterLayer } from '../PixelCharacterLayer';

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

// Pemetaan nilai customizer profil (PixelCharacter) -> nama file aset di /pixel/assets
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
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch member data dengan pixel character info
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, pixel_body, pixel_hair, pixel_face, pixel_clothing, pixel_accessories, chat_status')
          .eq('status', 'aktif')
          .limit(10);

        if (error) throw error;

        const mappedData = (data || []).map(member => ({
          id: member.id,
          name: member.full_name || 'Anonymous',
          pixel_body: member.pixel_body || 'medium',
          pixel_hair: pref('hair', member.pixel_hair || 'short'),
          pixel_face: pref('face', FACE_FALLBACK[member.pixel_face || ''] || member.pixel_face || 'normal'),
          pixel_clothing: CLOTHING_MAP[member.pixel_clothing || ''] || pref('clothing', member.pixel_clothing || 'hoodie'),
          pixel_accessories: member.pixel_accessories && member.pixel_accessories !== 'none'
            ? (ACCESSORY_MAP[member.pixel_accessories] || pref('aksesori', member.pixel_accessories))
            : undefined,
          chat_status: member.chat_status || '',
        }));

        setMembers(mappedData);
        if (mappedData.length > 0) {
          setSelectedMemberId(mappedData[0].id);
        }
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Gagal memuat data anggota');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  if (loading) {
    return (
      <div className="pixel-story-loading" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        Memuat Pixel Story...
      </div>
    );
  }

  if (error) {
    return (
      <div className="pixel-story-error" style={{ padding: '2rem', textAlign: 'center', color: '#d32f2f' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="pixel-story-section" style={{ marginBottom: '3rem', backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem' }}>
      <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: '#666', marginBottom: '1.5rem', fontWeight: 600 }}>
        🎭 Pixel Story - Status Anggota
      </h2>

      {/* Deretan Karakter */}
      <div
        className="pixel-story-carousel"
        style={{
          display: 'flex',
          gap: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          borderBottom: '2px solid #eee',
          marginBottom: '2rem',
        }}
      >
        {members.map(member => (
          <div
            key={member.id}
            className={`pixel-story-item ${selectedMemberId === member.id ? 'active' : ''}`}
            onClick={() => setSelectedMemberId(member.id)}
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              opacity: selectedMemberId === member.id ? 1 : 0.6,
              transition: 'opacity 0.2s',
              flex: '0 0 auto',
            }}
          >
            {/* Ring indicator ala Instagram */}
            <div
              style={{
                padding: '3px',
                borderRadius: '50%',
                background:
                  selectedMemberId === member.id
                    ? 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'
                    : '#ddd',
                marginBottom: '0.5rem',
                width: 'fit-content',
                margin: '0 auto 0.5rem',
              }}
            >
              <PixelCharacterLayer
                bodyColor={member.pixel_body}
                hairStyle={member.pixel_hair}
                faceExpression={member.pixel_face}
                clothingType={member.pixel_clothing}
                accessoryHead={member.pixel_accessories}
                size={48}
              />
            </div>

            <p style={{ fontSize: '0.75rem', fontWeight: 500, margin: '0.5rem 0 0', color: '#333' }}>
              {member.name.split(' ')[0]}
            </p>
          </div>
        ))}
      </div>

      {/* Chat Box */}
      {selectedMember && (
        <div
          className="pixel-story-chatbox"
          style={{
            backgroundColor: '#fff',
            border: '2px solid #333',
            borderRadius: '8px',
            padding: '1rem',
            maxWidth: '320px',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            margin: '0 auto',
          }}
        >
          {/* Pointer */}
          <div
            style={{
              position: 'absolute',
              bottom: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '10px solid #fff',
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '12px solid #333',
              zIndex: 1,
            }}
          />

          {/* Message */}
          <p
            style={{
              margin: '0',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#333',
              lineHeight: '1.4',
            }}
          >
            {selectedMember.chat_status || 'Halo, ini karakter aku! ✦'}
          </p>

          {/* Name */}
          <p
            style={{
              margin: '0.5rem 0 0',
              fontSize: '0.65rem',
              color: '#999',
              fontStyle: 'italic',
            }}
          >
            — {selectedMember.name}
          </p>
        </div>
      )}
    </div>
  );
}

export default PixelStoryContainer;
