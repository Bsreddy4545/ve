import { useEffect, useRef, useState } from 'react'
import { api, type FileItem } from '../api'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'gallery', label: 'Galleries' },
  { id: 'document', label: 'Documents' },
  { id: 'link', label: 'Links' },
  { id: 'other', label: 'Other' },
] as const

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

function icon(f: FileItem) {
  if (f.category === 'link') return '🔗'
  if (f.category === 'gallery' || f.mime?.startsWith('image/')) return '🖼️'
  if (f.category === 'document' || f.mime?.includes('pdf') || f.mime?.includes('word')) return '📄'
  return '📁'
}

export default function Files() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [uploadCategory, setUploadCategory] = useState('document')
  const [linkUrl, setLinkUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.files().then((d) => setFiles(d.files)).finally(() => setLoading(false))
  }, [])

  const onUpload = async (list: FileList | null) => {
    if (!list?.length) return
    setBusy(true)
    try {
      for (const file of Array.from(list)) {
        const form = new FormData()
        form.append('file', file)
        form.append('category', uploadCategory)
        const { file: saved } = await api.uploadFile(form)
        setFiles((f) => [saved, ...f])
      }
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkUrl.trim()) return
    const { file } = await api.addLink({ link_url: linkUrl.trim() })
    setFiles((f) => [file, ...f])
    setLinkUrl('')
  }

  const remove = async (id: number) => {
    await api.deleteFile(id)
    setFiles((f) => f.filter((x) => x.id !== id))
  }

  const shown = filter === 'all' ? files : files.filter((f) => f.category === filter)

  return (
    <div className="section">
      <header className="section-head">
        <div>
          <h2>Files</h2>
          <p>{files.length} item{files.length === 1 ? '' : 's'}</p>
        </div>
      </header>

      <div className="file-tools">
        <label className="upload-btn">
          <span>{busy ? 'Uploading…' : '⬆ Upload files'}</span>
          <input ref={fileInput} type="file" multiple hidden disabled={busy} onChange={(e) => onUpload(e.target.files)} />
        </label>
        <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
          <option value="gallery">Gallery</option>
          <option value="document">Document</option>
          <option value="other">Other</option>
        </select>
        <form className="link-add" onSubmit={addLink}>
          <input placeholder="…or paste a link URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <button type="submit" className="primary compact">Add link</button>
        </form>
      </div>

      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c.id} className={`chip ${filter === c.id ? 'active' : ''}`} onClick={() => setFilter(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p>No files here yet. Upload something or add a link.</p>
        </div>
      ) : (
        <div className="file-grid">
          {shown.map((f) => (
            <div key={f.id} className="file-card">
              <div className="file-icon">{icon(f)}</div>
              <div className="file-meta">
                {f.category === 'link' ? (
                  <a href={f.link_url ?? '#'} target="_blank" rel="noreferrer" className="file-name">{f.original_name}</a>
                ) : (
                  <a href={`/api/files/${f.id}/download`} target="_blank" rel="noreferrer" className="file-name">{f.original_name}</a>
                )}
                <span className="file-sub">{f.category}{f.size ? ` · ${formatSize(f.size)}` : ''}</span>
              </div>
              <button className="icon-btn" onClick={() => remove(f.id)} aria-label="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
