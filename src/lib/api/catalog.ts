import type { Category, Merchant } from '@/types'
import { apiFetch } from './client'

/** Kategorien des aktiven Kontos (inkl. `_count.merchants`) */
export const getCategories = <T = Category>() => apiFetch<T[]>('/categories')

export const createCategory = (data: { name: string; color: string }) =>
  apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify(data) })

export const updateCategory = (id: string, data: { name: string; color: string }) =>
  apiFetch<Category>(`/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteCategory = (id: string) =>
  apiFetch<unknown>(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const getMerchants = () => apiFetch<Merchant[]>('/merchants')

export const createMerchant = (data: Record<string, unknown>) =>
  apiFetch<Merchant>('/merchants', { method: 'POST', body: JSON.stringify(data) })

export const updateMerchant = (id: string, data: Record<string, unknown>) =>
  apiFetch<Merchant>(`/merchants/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteMerchant = (id: string) =>
  apiFetch<unknown>(`/merchants/${encodeURIComponent(id)}`, { method: 'DELETE' })
