import { httpClient } from './httpClient'
import type {
  ApiResponse,
  PatientProfile,
  AppointmentDTO,
  MedicationDTO,
  TestResultDTO,
  ActivityItemDTO,
  MessageDTO,
} from './types'

export async function fetchPatientProfile(
  patientId: string,
): Promise<PatientProfile> {
  const res = await httpClient.get<ApiResponse<PatientProfile>>(
    `/patients/${patientId}/profile`,
  )
  return res.data.data
}

export async function fetchAppointments(
  patientId: string,
): Promise<AppointmentDTO[]> {
  const res = await httpClient.get<ApiResponse<AppointmentDTO[]>>(
    `/patients/${patientId}/appointments`,
  )
  return res.data.data
}

export async function requestAppointment(
  patientId: string,
  reason: string,
): Promise<AppointmentDTO> {
  const res = await httpClient.post<ApiResponse<AppointmentDTO>>(
    `/patients/${patientId}/appointments`,
    { reason },
  )
  return res.data.data
}

export async function fetchMedications(
  patientId: string,
): Promise<MedicationDTO[]> {
  const res = await httpClient.get<ApiResponse<MedicationDTO[]>>(
    `/patients/${patientId}/medications`,
  )
  return res.data.data
}

export async function fetchTestResults(
  patientId: string,
): Promise<TestResultDTO[]> {
  const res = await httpClient.get<ApiResponse<TestResultDTO[]>>(
    `/patients/${patientId}/results`,
  )
  return res.data.data
}

export async function fetchActivityLog(
  patientId: string,
): Promise<ActivityItemDTO[]> {
  const res = await httpClient.get<ApiResponse<ActivityItemDTO[]>>(
    `/patients/${patientId}/activity`,
  )
  return res.data.data
}

export async function fetchMessages(
  patientId: string,
): Promise<MessageDTO[]> {
  const res = await httpClient.get<ApiResponse<MessageDTO[]>>(
    `/patients/${patientId}/messages`,
  )
  return res.data.data
}

export async function sendMessage(
  patientId: string,
  payload: { subject: string; body: string },
): Promise<MessageDTO> {
  const res = await httpClient.post<ApiResponse<MessageDTO>>(
    `/patients/${patientId}/messages`,
    payload,
  )
  return res.data.data
}

