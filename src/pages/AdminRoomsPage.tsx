import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useDatabaseMode } from '../context/DatabaseModeContext'
import { adminFetchRooms, adminCreateRoom, adminUpdateRoom, adminDeleteRoom } from '../api/adminApi'
import { Badge } from '../components/ui'
import type { RoomDTO, RoomType, RoomStatus } from '../api/types'

const ROOM_TYPES: RoomType[] = ['general', 'icu', 'surgical', 'pediatric', 'maternity', 'isolation']
const ROOM_STATUSES: RoomStatus[] = ['available', 'occupied', 'maintenance', 'reserved']

const DEMO_ROOMS: RoomDTO[] = [
  { id: 'r-101', number: '101', floor: 1, wing: 'A', type: 'general',   capacity: 2, status: 'occupied',     notes: null },
  { id: 'r-102', number: '102', floor: 1, wing: 'A', type: 'general',   capacity: 2, status: 'available',    notes: null },
  { id: 'r-icu-1', number: 'ICU-1', floor: 3, wing: 'ICU', type: 'icu', capacity: 1, status: 'occupied',     notes: 'Ventilator support' },
  { id: 'r-surg-1', number: 'SURG-1', floor: 2, wing: 'C', type: 'surgical', capacity: 1, status: 'available', notes: null },
]

function statusVariant(status: RoomStatus): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'available':   return 'success'
    case 'occupied':    return 'error'
    case 'maintenance': return 'warning'
    case 'reserved':    return 'info'
  }
}

interface RoomForm {
  number: string
  floor: string
  wing: string
  type: RoomType
  capacity: string
  status: RoomStatus
  notes: string
}

const emptyForm = (): RoomForm => ({
  number: '', floor: '1', wing: '', type: 'general', capacity: '1', status: 'available', notes: '',
})

export function AdminRoomsPage() {
  const { t } = useTranslation('admin')
  const { isDemoMode } = useDatabaseMode()

  const [rooms, setRooms] = useState<RoomDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<RoomDTO | null>(null)
  const [form, setForm] = useState<RoomForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode) { setRooms(DEMO_ROOMS); setLoading(false); return }
    adminFetchRooms()
      .then(setRooms)
      .catch(() => toast.error(t('admin:rooms.errorFetch')))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode])

  const openAdd = () => { setEditingRoom(null); setForm(emptyForm()); setShowForm(true) }
  const openEdit = (room: RoomDTO) => {
    setEditingRoom(room)
    setForm({
      number: room.number,
      floor: String(room.floor),
      wing: room.wing ?? '',
      type: room.type,
      capacity: String(room.capacity),
      status: room.status,
      notes: room.notes ?? '',
    })
    setShowForm(true)
  }
  const cancelForm = () => { setShowForm(false); setEditingRoom(null); setForm(emptyForm()) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        number: form.number.trim(),
        floor: parseInt(form.floor, 10),
        wing: form.wing.trim() || null,
        type: form.type,
        capacity: parseInt(form.capacity, 10),
        status: form.status,
        notes: form.notes.trim() || null,
      }
      if (editingRoom) {
        if (!isDemoMode) {
          const updated = await adminUpdateRoom(editingRoom.id, payload)
          setRooms((prev) => prev.map((r) => r.id === editingRoom.id ? updated : r))
        } else {
          setRooms((prev) => prev.map((r) => r.id === editingRoom.id ? { ...r, ...payload } : r))
        }
        toast.success(t('admin:rooms.successUpdate'))
      } else {
        if (!isDemoMode) {
          const created = await adminCreateRoom(payload)
          setRooms((prev) => [...prev, created])
        } else {
          setRooms((prev) => [...prev, { id: 'r-' + Date.now(), ...payload } as RoomDTO])
        }
        toast.success(t('admin:rooms.successCreate'))
      }
      cancelForm()
    } catch (err) {
      console.error('[AdminRoomsPage] Room save error:', err)
      toast.error(editingRoom ? t('admin:rooms.errorUpdate') : t('admin:rooms.errorCreate'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (!isDemoMode) await adminDeleteRoom(id)
      setRooms((prev) => prev.filter((r) => r.id !== id))
      toast.success(t('admin:rooms.successDelete'))
    } catch (err) {
      console.error('[AdminRoomsPage] Room delete error:', err)
      toast.error(t('admin:rooms.errorDelete'))
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const inputCls =
    'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-900'
  const labelCls = 'text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400'
  const selectCls = inputCls + ' cursor-pointer'

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('admin:rooms.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('admin:rooms.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="self-start rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          {t('admin:rooms.addRoom')}
        </button>
      </header>

      {showForm && (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-indigo-100 dark:bg-slate-800 dark:ring-indigo-900/40">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {editingRoom ? t('admin:rooms.editFormTitle') : t('admin:rooms.addFormTitle')}
          </h3>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="room-number" className={labelCls}>{t('admin:rooms.numberLabel')} *</label>
                <input
                  id="room-number"
                  type="text"
                  required
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                  placeholder={t('admin:rooms.numberPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="room-floor" className={labelCls}>{t('admin:rooms.floorLabel')} *</label>
                <input
                  id="room-floor"
                  type="number"
                  min={1}
                  required
                  value={form.floor}
                  onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="room-wing" className={labelCls}>{t('admin:rooms.wingLabel')}</label>
                <input
                  id="room-wing"
                  type="text"
                  value={form.wing}
                  onChange={(e) => setForm((f) => ({ ...f, wing: e.target.value }))}
                  placeholder={t('admin:rooms.wingPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="room-type" className={labelCls}>{t('admin:rooms.typeLabel')} *</label>
                <select
                  id="room-type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RoomType }))}
                  className={selectCls}
                >
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt} value={rt}>{t(`admin:inpatient.roomTypes.${rt}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="room-capacity" className={labelCls}>{t('admin:rooms.capacityLabel')} *</label>
                <input
                  id="room-capacity"
                  type="number"
                  min={1}
                  required
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="room-status" className={labelCls}>{t('admin:rooms.statusLabel')} *</label>
                <select
                  id="room-status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as RoomStatus }))}
                  className={selectCls}
                >
                  {ROOM_STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`admin:inpatient.roomBoard.${s}`)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="room-notes" className={labelCls}>{t('admin:rooms.notesLabel')}</label>
                <input
                  id="room-notes"
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={t('admin:rooms.notesPlaceholder')}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                {saving ? t('admin:rooms.saving') : t('admin:rooms.saveRoom')}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {t('admin:rooms.cancel')}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700 overflow-hidden">
        {loading ? (
          <p className="p-5 text-xs text-slate-500">{t('common:loading')}</p>
        ) : rooms.length === 0 ? (
          <p className="p-5 text-xs text-slate-500">{t('admin:rooms.noRooms')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr className="text-left text-[0.7rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">{t('admin:rooms.roomCol')}</th>
                  <th className="px-4 py-3">{t('admin:rooms.floorCol')}</th>
                  <th className="px-4 py-3">{t('admin:rooms.wingCol')}</th>
                  <th className="px-4 py-3">{t('admin:rooms.typeCol')}</th>
                  <th className="px-4 py-3">{t('admin:rooms.capacityCol')}</th>
                  <th className="px-4 py-3">{t('admin:rooms.statusCol')}</th>
                  <th className="px-4 py-3 text-right">{t('admin:rooms.actionsCol')}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, i) => (
                  <tr
                    key={room.id}
                    className={`text-slate-700 dark:text-slate-300 ${i % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-700/20' : 'bg-white dark:bg-slate-800'}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{room.number}</td>
                    <td className="px-4 py-3">{room.floor}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{room.wing ?? '—'}</td>
                    <td className="px-4 py-3">{t(`admin:inpatient.roomTypes.${room.type}`)}</td>
                    <td className="px-4 py-3">{room.capacity}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(room.status)}>
                        {t(`admin:inpatient.roomBoard.${room.status}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(room)}
                          className="rounded-lg border border-indigo-200 px-2.5 py-1 text-[0.7rem] font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                        >
                          {t('admin:rooms.editRoom')}
                        </button>
                        {confirmDeleteId === room.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleDelete(room.id)}
                              className="rounded-lg bg-rose-600 px-2.5 py-1 text-[0.7rem] font-medium text-white hover:bg-rose-700"
                            >
                              {t('admin:deleteUser.confirmButton')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[0.7rem] text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                            >
                              {t('admin:deleteUser.cancelButton')}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(room.id)}
                            className="rounded-lg border border-rose-200 px-2.5 py-1 text-[0.7rem] font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-900/20"
                          >
                            {t('admin:rooms.deleteRoom')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
