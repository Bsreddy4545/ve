export type User = {
  id: number
  email: string
  name: string | null
  picture: string | null
}

export type Task = {
  id: number
  title: string
  done: boolean
  priority: 'low' | 'normal' | 'high'
  due_date: string | null
  created_at: string
}

export type FileItem = {
  id: number
  category: 'gallery' | 'document' | 'link' | 'other'
  original_name: string
  link_url: string | null
  mime: string | null
  size: number | null
  created_at: string
}

export type Connector = {
  id: string
  name: string
  kind: string
  connected: boolean
  connected_at: string | null
}

export type Notification = {
  id: number
  source: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: options?.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export type Summary = {
  open_tasks: string
  done_tasks: string
  files: string
  connected: string
  unread: string
}

export const api = {
  me: () => request<{ user: User }>('/api/me'),
  summary: () => request<{ summary: Summary; mailEnabled: boolean }>('/api/summary'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  tasks: () => request<{ tasks: Task[] }>('/api/tasks'),
  addTask: (body: { title: string; priority?: string; due_date?: string | null }) =>
    request<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: number, body: Partial<Pick<Task, 'done' | 'title' | 'priority' | 'due_date'>>) =>
    request<{ task: Task }>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask: (id: number) => request(`/api/tasks/${id}`, { method: 'DELETE' }),

  files: () => request<{ files: FileItem[] }>('/api/files'),
  uploadFile: (form: FormData) => request<{ file: FileItem }>('/api/files', { method: 'POST', body: form }),
  addLink: (body: { link_url: string; original_name?: string }) =>
    request<{ file: FileItem }>('/api/files', {
      method: 'POST',
      body: JSON.stringify({ category: 'link', ...body }),
    }),
  deleteFile: (id: number) => request(`/api/files/${id}`, { method: 'DELETE' }),

  connectors: () => request<{ connectors: Connector[] }>('/api/connectors'),
  setConnector: (provider: string, connect: boolean) =>
    request(`/api/connectors/${provider}/${connect ? 'connect' : 'disconnect'}`, { method: 'POST' }),

  notifications: () => request<{ notifications: Notification[]; unread: number }>('/api/notifications'),
  markNotificationsRead: () => request('/api/notifications/read', { method: 'POST' }),
}
