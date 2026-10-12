'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, AlertCircle } from 'lucide-react'

interface Link {
  id?: string
  link_type: 'repository' | 'live' | 'instagram' | 'youtube' | 'portfolio' | 'behance' | 'figma' | 'other'
  url: string
  label?: string
}

interface ProjectFormProps {
  projectId?: string
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
}

const LINK_TYPES = [
  { value: 'repository', label: 'Repository' },
  { value: 'live', label: 'Live Demo' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'behance', label: 'Behance' },
  { value: 'figma', label: 'Figma' },
  { value: 'other', label: 'Lainnya' },
]

export default function ProjectForm({ projectId, initialData, onSuccess, onCancel }: ProjectFormProps) {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    image_url: initialData?.image_url || '',
    category: initialData?.category || '',
    isGroup: false,
    members: [] as string[],
  })

  const [links, setLinks] = useState<Link[]>(initialData?.links || [])
  const [newLink, setNewLink] = useState<Link>({
    link_type: 'repository',
    url: '',
    label: '',
  })
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')

  const handleAddLink = () => {
    if (!newLink.url.trim()) {
      setValidationError('URL tidak boleh kosong')
      return
    }
    try {
      new URL(newLink.url)
    } catch {
      setValidationError('URL tidak valid')
      return
    }
    setValidationError('')
    setLinks([...links, { ...newLink, id: Math.random().toString() }])
    setNewLink({ link_type: 'repository', url: '', label: '' })
  }

  const handleRemoveLink = (id?: string) => {
    if (id) {
      setLinks(links.filter(l => l.id !== id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.title.trim() || !formData.category) {
      setError('Judul dan kategori wajib diisi')
      return
    }

    if (links.length === 0) {
      setError('Minimal 1 link harus ditambahkan')
      return
    }

    startTransition(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Kamu harus login terlebih dahulu')
          return
        }

        let projectIdToUse = projectId

        // Create or update project
        if (!projectIdToUse) {
          const { data: project, error: projError } = await supabase
            .from('projects')
            .insert({
              user_id: user.id,
              title: formData.title.trim(),
              description: formData.description.trim(),
              image_url: formData.image_url.trim(),
              category: formData.category,
              status: 'pending',
            })
            .select('id')
            .single()

          if (projError) throw projError
          projectIdToUse = project.id
        } else {
          const { error: updateError } = await supabase
            .from('projects')
            .update({
              title: formData.title.trim(),
              description: formData.description.trim(),
              image_url: formData.image_url.trim(),
              category: formData.category,
            })
            .eq('id', projectIdToUse)
            .eq('user_id', user.id)

          if (updateError) throw updateError

          // Delete old links (for update)
          await supabase.from('project_links').delete().eq('project_id', projectIdToUse)
        }

        // Insert links
        const linksToInsert = links.map(link => ({
          project_id: projectIdToUse,
          link_type: link.link_type,
          url: link.url.trim(),
          label: link.label?.trim() || null,
        }))

        const { error: linksError } = await supabase
          .from('project_links')
          .insert(linksToInsert)

        if (linksError) throw linksError

        // Handle group members if group
        if (formData.isGroup && formData.members.length > 0) {
          await supabase
            .from('project_members')
            .delete()
            .eq('project_id', projectIdToUse)

          const membersToInsert = formData.members.map(memberId => ({
            project_id: projectIdToUse,
            user_id: memberId,
          }))

          const { error: membersError } = await supabase
            .from('project_members')
            .insert(membersToInsert)

          if (membersError) throw membersError
        }

        setFormData({
          title: '',
          description: '',
          image_url: '',
          category: '',
          isGroup: false,
          members: [],
        })
        setLinks([])
        onSuccess?.()
      } catch (err: any) {
        setError(err.message || 'Gagal menyimpan karya')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex gap-2 rounded-sm border-2 border-red-600 bg-red-50 p-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Judul Karya"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full border-2 border-dark px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm"
          required
        />
        <textarea
          placeholder="Deskripsi (opsional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full border-2 border-dark px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm"
        />
        <input
          type="url"
          placeholder="URL Image Cover"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          className="w-full border-2 border-dark px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm"
        />
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full border-2 border-dark px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm"
          required
        >
          <option value="">Pilih Kategori</option>
          <option value="Koding">Koding</option>
          <option value="Penelitian">Penelitian</option>
          <option value="Film">Film</option>
          <option value="Video">Video</option>
          <option value="Desain">Desain</option>
          <option value="Lomba">Lomba</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </div>

      {/* Links */}
      <div className="space-y-3 border-t-2 border-dark pt-4">
        <div className="font-bold text-sm">Tambahkan Link</div>
        
        <div className="space-y-2">
          <select
            value={newLink.link_type}
            onChange={(e) => setNewLink({ ...newLink, link_type: e.target.value as Link['link_type'] })}
            className="w-full border-2 border-dark px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm"
          >
            {LINK_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          
          <input
            type="url"
            placeholder="URL"
            value={newLink.url}
            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            className="w-full border-2 border-dark px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm"
            required
          />
          
          <input
            type="text"
            placeholder="Label (opsional, contoh: 'Main Repository')"
            value={newLink.label || ''}
            onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
            className="w-full border-2 border-dark px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm"
          />

          {validationError && <p className="text-xs text-red-600">{validationError}</p>}

          <button
            type="button"
            onClick={handleAddLink}
            className="inline-flex items-center gap-1.5 border-2 border-dark bg-paper px-3 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Link
          </button>
        </div>

        {/* Links List */}
        {links.length > 0 && (
          <div className="space-y-2 mt-4">
            {links.map((link, idx) => (
              <div key={link.id || idx} className="flex items-center justify-between gap-2 border-2 border-dark bg-paper p-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-dark">{LINK_TYPES.find(t => t.value === link.link_type)?.label}</div>
                  {link.label && <div className="text-xs text-dark">{link.label}</div>}
                  <div className="text-xs text-dark truncate underline">{link.url}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link.id)}
                  className="flex-shrink-0 p-1 hover:bg-red-50"
                >
                  <X className="w-4 h-4 text-dark" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 border-t-2 border-dark pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 border-2 border-dark bg-maroon text-white px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-red-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
        >
          {isPending ? 'Menyimpan...' : 'Simpan Karya'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border-2 border-dark bg-paper px-3 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-sm font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  )
}
