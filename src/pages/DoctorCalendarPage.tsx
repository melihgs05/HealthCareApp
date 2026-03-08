import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui'
import {
  fetchDoctorScheduleByDate,
  fetchDoctorAvailability,
  upsertAvailability,
  deleteAvailability,
  fetchBlockedTimes,
  addBlockedTime,
  deleteBlockedTime,
} from '../api/doctorApi'
import type { DoctorScheduleDTO, DoctorAvailabilityDTO, BlockedTimeDTO } from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

// ─── Demo fallback data ───────────────────────────────────────────
const DEMO_AVAILABILITY: DoctorAvailabilityDTO[] = [
  { id: 'av-1', dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 },
  { id: 'av-2', dayOfWeek: 1, startTime: '13:00', endTime: '17:00', slotDurationMinutes: 30 },
  { id: 'av-3', dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
  { id: 'av-4', dayOfWeek: 5, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 30 },
]
const DEMO_BLOCKED: BlockedTimeDTO[] = [
  { id: 'bl-1', date: '2026-03-20', startTime: '09:00', endTime: '12:00', reason: 'Conference leave' },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getMonthDates(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const cells: (Date | null)[] = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function DoctorCalendarPage() {
  const { user } = useAuth()
  const today = new Date()

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)

  const [dayAppts, setDayAppts] = useState<DoctorScheduleDTO[]>([])
  const [availability, setAvailability] = useState<DoctorAvailabilityDTO[]>([])
  const [blocked, setBlocked] = useState<BlockedTimeDTO[]>([])
  const [loadingDay, setLoadingDay] = useState(false)

  // Availability form
  const [avDay, setAvDay] = useState<number>(1)
  const [avStart, setAvStart] = useState('09:00')
  const [avEnd, setAvEnd] = useState('17:00')
  const [avSlot, setAvSlot] = useState(30)
  const [savingAv, setSavingAv] = useState(false)

  // Block time form
  const [blStart, setBlStart] = useState('09:00')
  const [blEnd, setBlEnd] = useState('12:00')
  const [blReason, setBlReason] = useState('')
  const [savingBl, setSavingBl] = useState(false)

  const doctorId = user?.id ?? 'demo-doctor-001'

  // Load availability + blocked when month changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAvailability(DEMO_AVAILABILITY)
      setBlocked(DEMO_BLOCKED)
      return
    }
    const monthStart = new Date(viewYear, viewMonth, 1).toISOString().slice(0, 10)
    const monthEnd = new Date(viewYear, viewMonth + 1, 0).toISOString().slice(0, 10)
    Promise.all([
      fetchDoctorAvailability(doctorId),
      fetchBlockedTimes(doctorId, monthStart, monthEnd),
    ]).then(([av, bl]) => {
      setAvailability(av)
      setBlocked(bl)
    }).catch(console.error)
  }, [doctorId, viewYear, viewMonth])

  // Load day appointments when date is selected
  useEffect(() => {
    if (!selectedDate) { setDayAppts([]); return }
    const dateStr = toDateStr(selectedDate)
    setLoadingDay(true)
    if (!isSupabaseConfigured) {
      setDayAppts([])
      setLoadingDay(false)
      return
    }
    fetchDoctorScheduleByDate(doctorId, dateStr)
      .then(setDayAppts)
      .catch(console.error)
      .finally(() => setLoadingDay(false))
  }, [doctorId, selectedDate])

  function toDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const isBlocked = (d: Date) => blocked.some((b) => b.date === toDateStr(d))

  const hasAvailability = (d: Date) => {
    const dow = d.getDay()
    return availability.some((a) => a.dayOfWeek === dow)
  }

  // ── Add availability ──
  const handleAddAvailability = async (e: FormEvent) => {
    e.preventDefault()
    setSavingAv(true)
    try {
      if (isSupabaseConfigured) {
        await upsertAvailability(doctorId, { dayOfWeek: avDay, startTime: avStart, endTime: avEnd, slotDurationMinutes: avSlot })
        setAvailability((prev) => [...prev, { id: `av-${Date.now()}`, dayOfWeek: avDay, startTime: avStart, endTime: avEnd, slotDurationMinutes: avSlot }])
      } else {
        setAvailability((prev) => [...prev, { id: `av-${Date.now()}`, doctorId, dayOfWeek: avDay, startTime: avStart, endTime: avEnd, slotDurationMinutes: avSlot }])
      }
      toast.success('Availability slot added')
    } catch {
      toast.error('Failed to add availability')
    } finally {
      setSavingAv(false)
    }
  }

  const handleDeleteAvailability = async (id: string) => {
    try {
      if (isSupabaseConfigured) await deleteAvailability(id)
      setAvailability((prev) => prev.filter((a) => a.id !== id))
      toast.success('Slot removed')
    } catch {
      toast.error('Failed to remove slot')
    }
  }

  // ── Block time ──
  const handleBlockDate = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedDate) return
    setSavingBl(true)
    try {
      const entry = { date: toDateStr(selectedDate), startTime: blStart, endTime: blEnd, reason: blReason }
      if (isSupabaseConfigured) {
        await addBlockedTime(doctorId, entry)
        setBlocked((prev) => [...prev, { id: `bl-${Date.now()}`, ...entry }])
      } else {
        setBlocked((prev) => [...prev, { id: `bl-${Date.now()}`, ...entry }])
      }
      toast.success('Time blocked')
      setBlReason('')
    } catch {
      toast.error('Failed to block time')
    } finally {
      setSavingBl(false)
    }
  }

  const handleDeleteBlocked = async (id: string) => {
    try {
      if (isSupabaseConfigured) await deleteBlockedTime(id)
      setBlocked((prev) => prev.filter((b) => b.id !== id))
      toast.success('Block removed')
    } catch {
      toast.error('Failed to remove block')
    }
  }

  const cardCls = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:ring-emerald-900/40'
  const prevMonth = () => { if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) } else setViewMonth((m) => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) } else setViewMonth((m) => m + 1) }

  const cells = getMonthDates(viewYear, viewMonth)
  const selectedDayBlocked = selectedDate ? blocked.filter((b) => b.date === toDateStr(selectedDate)) : []

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Calendar & Availability</h2>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Calendar grid ── */}
        <div className={cardCls + ' lg:col-span-2'}>
          {/* Month nav */}
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="rounded-xl p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">‹</button>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
            <button type="button" onClick={nextMonth} className="rounded-xl p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">›</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 text-center">
            {DAY_NAMES.map((d) => (
              <span key={d} className="pb-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">{d}</span>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} />
              const dateStr = toDateStr(cell)
              const isTodayCell = dateStr === toDateStr(today)
              const isSelected = selectedDate && dateStr === toDateStr(selectedDate)
              const blocked_ = isBlocked(cell)
              const avail = hasAvailability(cell)
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell)}
                  className={[
                    'relative m-0.5 rounded-xl p-1.5 text-xs transition',
                    isSelected ? 'bg-emerald-600 text-white font-semibold' :
                      isTodayCell ? 'bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-900/20 dark:text-emerald-300' :
                        'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
                  ].join(' ')}
                >
                  {cell.getDate()}
                  {!isSelected && (
                    <>
                      {avail && !blocked_ && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-400" />}
                      {blocked_ && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-red-400" />}
                    </>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[0.65rem] text-slate-500">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />Available</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />Blocked</span>
          </div>
        </div>

        {/* ── Day detail ── */}
        <div className="space-y-3">
          {selectedDate && (
            <div className={cardCls}>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>

              {loadingDay ? <p className="text-xs text-slate-500">Loading…</p> : (
                <>
                  {dayAppts.length === 0 ? <p className="text-xs text-slate-500">No appointments.</p> : (
                    <div className="space-y-1.5 mb-3">
                      {dayAppts.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-700/40">
                          <div>
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{a.time} — {a.reason}</p>
                            <p className="text-[0.65rem] text-slate-500">{a.patient}</p>
                          </div>
                          <Badge variant={a.status === 'Completed' ? 'success' : a.status === 'Upcoming' ? 'info' : 'error'}>
                            {a.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Block selected day */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400">
                  + Block time on this day
                </summary>
                <form onSubmit={(e) => void handleBlockDate(e)} className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[0.65rem] text-slate-500">From</label>
                      <input type="time" value={blStart} onChange={(e) => setBlStart(e.target.value)} className="mt-0.5 w-full rounded-xl border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[0.65rem] text-slate-500">To</label>
                      <input type="time" value={blEnd} onChange={(e) => setBlEnd(e.target.value)} className="mt-0.5 w-full rounded-xl border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                    </div>
                  </div>
                  <input value={blReason} onChange={(e) => setBlReason(e.target.value)} placeholder="Reason (optional)" className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                  <button type="submit" disabled={savingBl} className="w-full rounded-xl bg-red-600 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                    {savingBl ? 'Blocking…' : 'Block'}
                  </button>
                </form>
              </details>

              {selectedDayBlocked.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedDayBlocked.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-xl bg-red-50 px-2 py-1.5 dark:bg-red-900/10">
                      <p className="text-xs text-red-700 dark:text-red-300">{b.startTime}–{b.endTime} {b.reason ? `· ${b.reason}` : ''}</p>
                      <button type="button" onClick={() => void handleDeleteBlocked(b.id)} className="text-[0.65rem] text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Weekly Availability ── */}
      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Weekly Availability</h3>
        <form onSubmit={(e) => void handleAddAvailability(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Day</label>
            <select value={avDay} onChange={(e) => setAvDay(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              {FULL_DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Start</label>
            <input type="time" value={avStart} onChange={(e) => setAvStart(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">End</label>
            <input type="time" value={avEnd} onChange={(e) => setAvEnd(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Slot (min)</label>
            <input type="number" min={10} max={90} step={5} value={avSlot} onChange={(e) => setAvSlot(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={savingAv} className="w-full rounded-xl bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {savingAv ? 'Saving…' : 'Add Slot'}
            </button>
          </div>
        </form>

        {availability.length === 0 ? (
          <p className="text-xs text-slate-500">No recurring slots defined yet.</p>
        ) : (
          <div className="space-y-1">
            {availability
              .slice()
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
              .map((av) => (
                <div key={av.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 dark:bg-slate-700/40">
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{FULL_DAY_NAMES[av.dayOfWeek]}</span>
                    {' '}{av.startTime} – {av.endTime}
                    {' '}· {av.slotDurationMinutes} min slots
                  </p>
                  <button type="button" onClick={() => void handleDeleteAvailability(av.id)} className="text-[0.65rem] text-red-500 hover:text-red-700">Remove</button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── All blocked times this month ── */}
      {blocked.length > 0 && (
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Blocked this month
          </h3>
          <div className="space-y-1">
            {blocked.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-1.5 dark:bg-red-900/10">
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{b.date}</span> {b.startTime}–{b.endTime} {b.reason ? `· ${b.reason}` : ''}
                </p>
                <button type="button" onClick={() => void handleDeleteBlocked(b.id)} className="text-[0.65rem] text-red-500 hover:text-red-700">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
