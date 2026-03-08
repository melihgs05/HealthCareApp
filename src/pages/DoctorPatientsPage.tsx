import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui'
import { fetchPatientList } from '../api/doctorApi'
import type { PatientSummaryDTO } from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

const DEMO_PATIENTS: PatientSummaryDTO[] = [
  { id: 'demo-patient-001', name: 'Alex Johnson', mrn: 'MRN-000001', dob: '1985-04-12', insurance: 'BlueCross PPO', primaryDoctorId: 'demo-doctor-001', lastVisit: '2026-02-01', nextAppt: '2026-03-15', status: 'Active', activeMedicationCount: 2 },
  { id: 'p-002', name: 'Maria Gomez', mrn: 'MRN-000002', dob: '1972-08-23', insurance: 'Aetna HMO', primaryDoctorId: 'demo-doctor-001', lastVisit: '2026-01-20', nextAppt: '2026-03-10', status: 'Follow-up', activeMedicationCount: 3 },
  { id: 'p-003', name: 'James Lee', mrn: 'MRN-000003', dob: '1990-11-05', insurance: 'United PPO', primaryDoctorId: 'demo-doctor-001', lastVisit: '2025-12-14', nextAppt: '—', status: 'Active', activeMedicationCount: 1 },
  { id: 'p-004', name: 'Sarah Mitchell', mrn: 'MRN-000004', dob: '1965-03-30', insurance: 'Medicare', primaryDoctorId: 'demo-doctor-001', lastVisit: '2026-02-10', nextAppt: '2026-04-01', status: 'Active', activeMedicationCount: 4 },
  { id: 'p-005', name: 'David Park', mrn: 'MRN-000005', dob: '2001-07-19', insurance: 'Student Plan', primaryDoctorId: 'demo-doctor-001', lastVisit: '2025-11-30', nextAppt: '—', status: 'Active', activeMedicationCount: 0 },
]

export function DoctorPatientsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientSummaryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setPatients(DEMO_PATIENTS)
      setLoading(false)
      return
    }
    fetchPatientList(user.id)
      .then(setPatients)
      .catch(() => toast.error('Failed to load patients'))
      .finally(() => setLoading(false))
  }, [user])

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase()
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      (p.insurance ?? '').toLowerCase().includes(q)
    )
  })

  const cardCls = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:ring-emerald-900/40'

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">My Patients</h2>

      <div className={cardCls}>
        {/* Search */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </span>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, MRN or insurance…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-8 pr-4 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <p className="text-xs text-slate-500 whitespace-nowrap">{filtered.length} patient{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500">Loading patients…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500">No patients match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">MRN</th>
                  <th className="pb-3 pr-4">Date of Birth</th>
                  <th className="pb-3 pr-4">Insurance</th>
                  <th className="pb-3 pr-4">Last Visit</th>
                  <th className="pb-3 pr-4">Next Appt</th>
                  <th className="pb-3 pr-4">Active Meds</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="group text-slate-700 dark:text-slate-300 hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                    <td className="py-2.5 pr-4 font-mono text-[0.7rem]">{p.mrn}</td>
                    <td className="py-2.5 pr-4">{p.dob ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.insurance ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.lastVisit ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.nextAppt ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-center">{p.activeMedicationCount}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={p.status === 'Active' ? 'success' : p.status === 'Follow-up' ? 'warning' : 'neutral'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/patients/${p.id}/chart`)}
                        className="rounded-xl bg-emerald-600 px-3 py-1 text-[0.7rem] font-medium text-white hover:bg-emerald-700 transition-colors"
                      >
                        Open Chart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
