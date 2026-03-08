import { httpClient } from './httpClient'
import type {
  ApiResponse,
  PaginatedResponse,
  AdminMetricsDTO,
  SystemEventDTO,
  IntegrationDTO,
  AdminUserDTO,
} from './types'

export async function fetchAdminMetrics(): Promise<AdminMetricsDTO> {
  const res = await httpClient.get<ApiResponse<AdminMetricsDTO>>('/admin/metrics')
  return res.data.data
}

export async function fetchSystemEvents(): Promise<SystemEventDTO[]> {
  const res = await httpClient.get<ApiResponse<SystemEventDTO[]>>('/admin/events')
  return res.data.data
}

export async function fetchIntegrations(): Promise<IntegrationDTO[]> {
  const res = await httpClient.get<ApiResponse<IntegrationDTO[]>>('/admin/integrations')
  return res.data.data
}

export async function fetchUsers(
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<PaginatedResponse<AdminUserDTO>> {
  const res = await httpClient.get<PaginatedResponse<AdminUserDTO>>('/admin/users', {
    params: { page, pageSize, search },
  })
  return res.data
}

export async function updateUserStatus(
  userId: string,
  status: AdminUserDTO['status'],
): Promise<AdminUserDTO> {
  const res = await httpClient.patch<ApiResponse<AdminUserDTO>>(
    `/admin/users/${userId}/status`,
    { status },
  )
  return res.data.data
}
