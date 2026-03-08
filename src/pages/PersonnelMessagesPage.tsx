import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui'
import { fetchDoctorInbox, replyToMessage, markDoctorMessageRead } from '../api/doctorApi'
import type { MessageDTO } from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

const DEMO_MESSAGES: MessageDTO[] = [
  {
    id: 'pmsg-001', fromId: 'demo-doctor-001', toId: 'demo-staff-001',
    from: 'Dr. Emily Carter', subject: 'Lab order for Alex Johnson',
    body: 'Please process the CBC and metabolic panel for patient Alex Johnson (MRN-000001). Priority: routine. Thank you.',
    date: '2026-03-08T09:00:00', read: false, parentId: null,
  },
  {
    id: 'pmsg-002', fromId: 'demo-doctor-002', toId: 'demo-staff-001',
    from: 'Dr. Michael Lee', subject: 'Specimen collection instructions',
    body: 'For patient Maria Gomez — please collect a fasting blood sample before 10 AM tomorrow for her lipid panel.',
    date: '2026-03-07T14:30:00', read: true, parentId: null,
  },
]

export function PersonnelMessagesPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MessageDTO | null>(null)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [searchQ, setSearchQ] = useState('')

  const staffId = user?.id ?? 'demo-staff-001'

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessages(DEMO_MESSAGES)
      setLoading(false)
      return
    }
    fetchDoctorInbox(staffId)
      .then(setMessages)
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false))
  }, [staffId])

  const handleSelect = async (msg: MessageDTO) => {
    setSelected(msg)
    setReply('')
    if (!msg.read) {
      if (isSupabaseConfigured) {
        try { await markDoctorMessageRead(msg.id) } catch { /* ignore */ }
      }
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: true } : m))
    }
  }

  const handleReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !selected || !user) return
    setSendingReply(true)
    try {
      if (isSupabaseConfigured) {
        await replyToMessage(staffId, selected.fromId, selected.id, reply.trim())
      }
      toast.success('Reply sent')
      setReply('')
    } catch {
      toast.error('Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const filtered = messages.filter((m) => {
    const q = searchQ.toLowerCase()
    return !q || m.from.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q) || (m.body ?? '').toLowerCase().includes(q)
  })

  const unreadCount = messages.filter((m) => !m.read).length

  const cardCls = 'rounded-3xl bg-white shadow-sm ring-1 ring-indigo-100 dark:bg-slate-800 dark:ring-indigo-900/40'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Messages</h2>
        {unreadCount > 0 && (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[0.65rem] font-medium text-white">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className={cardCls + ' overflow-hidden'}>
        <div className="flex h-[calc(100vh-220px)] min-h-[400px]">
          {/* ── Message list ── */}
          <div className="flex w-full flex-col border-r border-slate-100 dark:border-slate-700 md:w-72 lg:w-80">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search messages…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-xs text-slate-500">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">No messages.</p>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void handleSelect(m)}
                    className={[
                      'w-full border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/40',
                      selected?.id === m.id ? 'bg-indigo-50 dark:bg-indigo-900/10' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className={['text-xs truncate', m.read ? 'font-normal text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-100'].join(' ')}>
                        {m.from}
                      </span>
                      {!m.read && <span className="ml-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />}
                    </div>
                    <p className="mt-0.5 truncate text-[0.7rem] font-medium text-slate-800 dark:text-slate-200">{m.subject}</p>
                    <p className="mt-0.5 truncate text-[0.65rem] text-slate-500">{(m.body ?? m.subject).slice(0, 60)}…</p>
                    <p className="mt-1 text-[0.6rem] text-slate-400">{new Date(m.date).toLocaleDateString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Message detail / reply ── */}
          <div className="hidden flex-1 flex-col md:flex">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
                Select a message to read
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-y-auto p-5">
                <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selected.subject}</p>
                      <p className="mt-0.5 text-xs text-slate-500">From: {selected.from} · {new Date(selected.date).toLocaleString()}</p>
                    </div>
                    <Badge variant={selected.read ? 'neutral' : 'info'}>{selected.read ? 'Read' : 'Unread'}</Badge>
                  </div>
                </div>
                <p className="flex-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {selected.body}
                </p>
                <form onSubmit={(e) => void handleReply(e)} className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Reply</label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    placeholder={`Reply to ${selected.from}…`}
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !reply.trim()}
                    className="mt-2 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {sendingReply ? 'Sending…' : 'Send Reply'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
