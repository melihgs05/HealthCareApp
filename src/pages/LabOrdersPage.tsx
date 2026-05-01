import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useDatabaseMode } from '../context/DatabaseModeContext'
import { fetchPendingLabTests, updateTestResult } from '../api/personnelApi'
import { Badge } from '../components/ui'
import type { TestResultDTO } from '../api/types'

const DEMO_LAB_ORDERS: TestResultDTO[] = [
  { id: 'lo-001', date: new Date().toISOString().slice(0, 10), type: 'Complete Metabolic Panel', summary: '', status: 'In progress', orderedBy: 'Dr. Emily Carter' },
  { id: 'lo-002', date: new Date().toISOString().slice(0, 10), type: 'CBC with Differential', summary: '', status: 'In progress', orderedBy: 'Dr. Emily Carter' },
  { id: 'lo-003', date: new Date().toISOString().slice(0, 10), type: 'Chest X-Ray (PA + Lateral)', summary: '', status: 'In progress', orderedBy: 'Dr. Michael Lee' },
]

const MAX_FILE_MB = 10

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function LabOrdersPage() {
  const { user } = useAuth()
  const { isDemoMode } = useDatabaseMode()
  const { t } = useTranslation('admin')

  const [orders, setOrders] = useState<TestResultDTO[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resultSummary, setResultSummary] = useState('')
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileMime, setFileMime] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isDemoMode) {
      setOrders(DEMO_LAB_ORDERS)
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const data = await fetchPendingLabTests(user?.id ?? '')
        setOrders(data)
      } catch {
        toast.error(t('admin:labOrders.errorToast'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user?.id, isDemoMode, t])

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(t('admin:labOrders.fileTooLarge', { max: MAX_FILE_MB }))
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    const dataUrl = await readFileAsDataURL(file)
    setFileDataUrl(dataUrl)
    setFileName(file.name)
    setFileMime(file.type)
  }

  const clearFile = () => {
    setFileDataUrl(null)
    setFileName(null)
    setFileMime(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const selectOrder = (id: string) => {
    setSelectedId(id)
    setResultSummary('')
    clearFile()
  }

  const handleSubmitResult = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId || !resultSummary.trim()) return
    setSubmitting(true)
    try {
      if (!isDemoMode) {
        await updateTestResult(selectedId, resultSummary, 'Normal', fileDataUrl ?? undefined)
      }
      setOrders((prev) => prev.filter((o) => o.id !== selectedId))
      toast.success(t('admin:labOrders.successToast'))
      setSelectedId(null)
      setResultSummary('')
      clearFile()
    } catch {
      toast.error(t('admin:labOrders.errorToast'))
    } finally {
      setSubmitting(false)
    }
  }

  const pending = orders.filter((o) => o.status === 'In progress')

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('admin:labOrders.title')}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('admin:labOrders.subtitle')}
        </p>
      </header>

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('admin:labOrders.pendingOrders')}
          {pending.length > 0 && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[0.65rem] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {pending.length}
            </span>
          )}
        </h3>

        {loading ? (
          <p className="text-xs text-slate-500">{t('common:loading')}</p>
        ) : pending.length === 0 ? (
          <p className="text-xs text-slate-500">{t('admin:labOrders.noOrders')}</p>
        ) : (
          <div className="space-y-3">
            {pending.map((order) => (
              <div key={order.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-slate-700/40 dark:ring-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{order.type}</p>
                    {order.orderedBy && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t('admin:labOrders.orderedBy')}: {order.orderedBy}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{order.date}</p>
                  </div>
                  <Badge variant="info">{order.status}</Badge>
                </div>

                {selectedId === order.id ? (
                  <form onSubmit={(e) => void handleSubmitResult(e)} className="mt-3 space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-900/10">

                    {/* Summary textarea */}
                    <div>
                      <label htmlFor={`res-${order.id}`} className="block text-xs font-medium text-indigo-900 dark:text-indigo-300">
                        {t('admin:labOrders.resultLabel')}
                      </label>
                      <textarea
                        id={`res-${order.id}`}
                        value={resultSummary}
                        onChange={(e) => setResultSummary(e.target.value)}
                        rows={3}
                        required
                        placeholder={t('admin:labOrders.resultPlaceholder')}
                        className="mt-1 w-full resize-none rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-700 dark:focus:ring-indigo-900"
                      />
                    </div>

                    {/* File attachment */}
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-indigo-900 dark:text-indigo-300">
                        {t('admin:labOrders.attachFile')}
                        <span className="ml-1 font-normal text-indigo-500 dark:text-indigo-400">
                          — PDF, image, document (max {MAX_FILE_MB} MB)
                        </span>
                      </p>
                      {fileDataUrl ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-900/20">
                          {fileMime?.startsWith('image/') ? (
                            <img src={fileDataUrl} alt="lab file preview" className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200" />
                          ) : (
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                              <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <p className="flex-1 truncate text-xs font-medium text-emerald-700 dark:text-emerald-300">{fileName}</p>
                          <button type="button" onClick={clearFile} className="rounded p-0.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400" aria-label={t('admin:labOrders.removeFile')}>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-white px-3 py-2.5 text-xs text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-50/60 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700">
                          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32" />
                          </svg>
                          {t('admin:labOrders.chooseFile')}
                          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="sr-only" onChange={(e) => void handleFileChange(e)} />
                        </label>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                        {submitting ? t('admin:labOrders.submitting') : t('admin:labOrders.submit')}
                      </button>
                      <button type="button" onClick={() => { setSelectedId(null); setResultSummary(''); clearFile() }} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                        {t('admin:labOrders.cancel')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => selectOrder(order.id)} className="mt-2 rounded-xl bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-700">
                    {t('admin:labOrders.enterResults')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
