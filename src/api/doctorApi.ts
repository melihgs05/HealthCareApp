import { httpClient } from './httpClient'
import type { ApiResponse, DoctorScheduleDTO, PatientSummaryDTO, MessageDTO } from './types'

export async function fetchTodaySchedule(doctorId: string): Promise<DoctorScheduleDTO[]> {
  const res = await httpClient.get<ApiResponse<DoctorScheduleDTO[]>>(
    `/doctors/${doctorId}/schedule/today`,
  )
  return res.data.data
}

export async function fetchPatientList(doctorId: string): Promise<PatientSummaryDTO[]> {
  const res = await httpClient.get<ApiResponse<PatientSummaryDTO[]>>(
    `/doctors/${doctorId}/patients`,
  )
  return res.data.data
}

export async function fetchDoctorInbox(doctorId: string): Promise<MessageDTO[]> {
  const res = await httpClient.get<ApiResponse<MessageDTO[]>>(
    `/doctors/${doctorId}/messages`,
  )
  return res.data.data
}

export async function replyToMessage(
  doctorId: string,
  messageId: string,
  body: string,
): Promise<MessageDTO> {
  const res = await httpClient.post<ApiResponse<MessageDTO>>(
    `/doctors/${doctorId}/messages/${messageId}/reply`,
    { body },
  )
  return res.data.data
}
