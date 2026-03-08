import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { usePatientData } from '../context/PatientDataContext'
import { Badge } from '../components/ui'
import { fetchDoctors, fetchDoctorAvailableSlots } from '../api/patientApi'
import type { DoctorInfoDTO, DoctorAvailabilitySlot } from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

// Demo doctors fallback
const DEMO_DOCTORS: DoctorInfoDTO[] = [
  { id: 'demo-doctor-001', name: 'Dr. Emily Carter', specialty: 'Internal Medicine', consultationRoom: 'Room 3A', availableDays: [1, 2, 3, 4, 5] },
  { id: 'demo-doctor-002', name: 'Dr. Michael Lee', specialty: 'Cardiology', consultationRoom: 'Room 2B', availableDays: [1, 3, 5] },
  { id: 'demo-doctor-003', name: 'Dr. Sarah Kim', specialty: 'Family Medicine', consultationRoom: 'Room 1C', availableDays: [2, 4] },
]

const DEMO_SLOTS: DoctorAvailabilitySlot[] = [
  { time: '09:00', available: true }, { time: '09:30', available: false }, { time: '10:00', available: true },
  { time: '10:30', available: true }, { time: '11:00', available: false }, { time: '11:30', available: true },
  { time: '14:00', available: true }, { time: '14:30', available: true }, { time: '15:00', available: false },
  { time: '15:30', available: true }, { time: '16:00', available: true },
]

export function AppointmentsPage() {
  const { appointments, requestAppointment } = usePatientData()
  const { t } = useTranslation(['portal', 'common'])
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [showBooking, setShowBooking] = useState(false)

  // Booking form state
  const [doctors, setDoctors] = useState<DoctorInfoDTO[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [appointmentType, setAppointmentType] = useState('')
  const [availableSlots, setAvailableSlots] = useState<DoctorAvailabilitySlot[]>([])
  const [selectedTime, setSelectedTime] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) {
        setDoctors(DEMO_DOCTORS)
        return
      }
      try {
        const data = await fetchDoctors()
        setDoctors(data)
      } catch {
        setDoctors(DEMO_DOCTORS)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) {
      setAvailableSlots([])
      setSelectedTime('')
      return
    }
    const load = async () => {
      setLoadingSlots(true)
      setSelectedTime('')
      try {
        if (!isSupabaseConfigured) {
          setAvailableSlots(DEMO_SLOTS)
        } else {
          const slots = await fetchDoctorAvailableSlots(selectedDoctorId, selectedDate)
          setAvailableSlots(slots)
        }
      } catch {
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    void load()
  }, [selectedDoctorId, selectedDate])

  const handleBook = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedDoctorId || !selectedDate || !selectedTime || !appointmentType.trim()) {
      toast.error('Please fill in all fields and select a time slot.')
      return
    }
    setSubmitting(true)
    try {
      await requestAppointment({
        doctorId: selectedDoctorId,
        date: selectedDate,
        time: selectedTime,
        type: appointmentType.trim(),
      })
      toast.success(t('portal:appointments.requestSent'))
      setShowBooking(false)
      setSelectedDoctorId('')
      setSelectedDate('')
      setSelectedTime('')
      setAppointmentType('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)
  const minDate = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('portal:appointments.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('portal:appointments.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-[0.7rem] dark:bg-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={[
                'rounded-full px-3 py-1 transition',
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400',
              ].join(' ')}
            >
              {t('portal:appointments.listView')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={[
                'rounded-full px-3 py-1 transition',
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400',
              ].join(' ')}
            >
              {t('portal:appointments.calendarView')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowBooking((v) => !v)}
            className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700"
          >
            + Book Appointment
          </button>
        </div>
      </header>

      {/* ── Booking Form ── */}
      {showBooking && (
        <form
          onSubmit={(e) => void handleBook(e)}
          className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700 space-y-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Book a New Appointment
          </p>

          {/* Step 1: Doctor */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Doctor
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="">— Choose a doctor —</option>
              {doctors.map((d) => (
                <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" key={d.id} value={d.id}>
                  {d.name}{d.specialty ? ` (${d.specialty})` : ''}
                </option>
              ))}
            </select>
            {selectedDoctor && (
              <p className="mt-1 text-[0.7rem] text-slate-500">
                Room: {selectedDoctor.consultationRoom ?? 'TBD'}
              </p>
            )}
          </div>

          {/* Step 2: Date */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Preferred Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={!selectedDoctorId}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          {/* Step 3: Available Slots */}
          {selectedDate && selectedDoctorId && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Available Time Slots
              </label>
              {loadingSlots ? (
                <p className="text-xs text-slate-500">Loading slots…</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-slate-500">No available slots for this date.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={[
                        'rounded-xl px-3 py-1.5 text-xs font-medium transition border',
                        !slot.available
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600'
                          : selectedTime === slot.time
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
                      ].join(' ')}
                    >
                      {slot.time}
                      {!slot.available && <span className="ml-1 text-[0.6rem]">Busy</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Appointment type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason / Type
            </label>
            <input
              type="text"
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value)}
              placeholder="e.g. Annual physical, Follow-up, Consultation…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowBooking(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTime}
              className="rounded-xl bg-sky-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
            >
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      )}

      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">{t('portal:appointments.tableDate')}</th>
                <th className="px-4 py-3">{t('portal:appointments.tableTime')}</th>
                <th className="px-4 py-3">{t('portal:appointments.tableProvider')}</th>
                <th className="px-4 py-3">{t('portal:appointments.tableType')}</th>
                <th className="px-4 py-3">{t('portal:appointments.tableLocation')}</th>
                <th className="px-4 py-3 text-right">{t('portal:appointments.tableStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, index) => (
                <tr
                  key={appt.id}
                  className={[
                    'text-xs text-slate-700 dark:text-slate-300',
                    index % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-700/20' : 'bg-white dark:bg-slate-800',
                  ].join(' ')}
                >
                  <td className="px-4 py-3">{appt.date}</td>
                  <td className="px-4 py-3">{appt.time}</td>
                  <td className="px-4 py-3">{appt.provider}</td>
                  <td className="px-4 py-3">{appt.type}</td>
                  <td className="px-4 py-3">{appt.location}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant={
                        appt.status === 'Upcoming'
                          ? 'info'
                          : appt.status === 'Completed'
                          ? 'success'
                          : 'error'
                      }
                    >
                      {appt.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('portal:appointments.calendarView')}
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            {t('portal:appointments.calendarNote')}
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.7rem] text-slate-600">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-xl bg-sky-50 px-1.5 py-1 text-sky-900 ring-1 ring-sky-100 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-800"
              >
                <div className="font-semibold">{appt.date.slice(-2)}</div>
                <div className="mt-0.5">{appt.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

