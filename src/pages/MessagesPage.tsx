import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { usePatientData } from '../context/PatientDataContext'
import { fetchDoctors } from '../api/patientApi'
import type { DoctorInfoDTO } from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

const DEMO_DOCTORS: DoctorInfoDTO[] = [
  { id: 'demo-doctor-001', name: 'Dr. Emily Carter', specialty: 'Internal Medicine', consultationRoom: 'Room 3A', availableDays: [1,2,3,4,5] },
  { id: 'demo-doctor-002', name: 'Dr. Michael Lee', specialty: 'Cardiology', consultationRoom: 'Room 2B', availableDays: [1,3,5] },
]

export function MessagesPage() {
  const { messages, addMessage } = usePatientData()
  const { t } = useTranslation(['portal', 'common'])
  const [isComposing, setIsComposing] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [doctors, setDoctors] = useState<DoctorInfoDTO[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) { setDoctors(DEMO_DOCTORS); return }
      try { setDoctors(await fetchDoctors()) } catch { setDoctors(DEMO_DOCTORS) }
    }
    void load()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setSubmitting(true)
    try {
      await addMessage({
        toId: selectedDoctorId || (doctors[0]?.id ?? ''),
        from: 'You',
        subject: subject.trim(),
        body: body.trim(),
      })
      setSubject('')
      setBody('')
      setIsComposing(false)
      toast.success(t('portal:messages.sentSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('portal:messages.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('portal:messages.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsComposing(true)}
          className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          {t('portal:messages.newMessage')}
        </button>
      </header>

      {isComposing && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('portal:messages.composeTitle')}
          </p>
          <div className="mt-2 space-y-2 text-xs">
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="">— Select recipient —</option>
              {doctors.map((d) => (
                <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" key={d.id} value={d.id}>
                  {d.name}{d.specialty ? ` · ${d.specialty}` : ''}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('portal:messages.subjectPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-600"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('portal:messages.bodyPlaceholder')}
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-600"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-sky-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              {submitting ? 'Sending…' : t('portal:messages.sendButton')}
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        {messages.length === 0 ? (
          <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
            {t('portal:messages.noMessages')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs dark:divide-slate-700">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={[
                  'flex items-start gap-3 px-4 py-3',
                  !msg.read ? 'bg-sky-50/60 dark:bg-sky-900/10' : 'bg-white dark:bg-slate-800',
                ].join(' ')}
              >
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-sky-500" />
                <div className="flex-1">
                  <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {msg.date} · {t('portal:messages.from')} {msg.from}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {msg.subject}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-slate-700 dark:text-slate-300">
                    {msg.preview}
                  </p>
                </div>
                {!msg.read && (
                  <span className="ml-2 rounded-full bg-sky-100 px-2 py-1 text-[0.65rem] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                    {t('portal:messages.new')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

