import { NextRequest } from 'next/server'

export type RouteContext<T> = {
  params: T
} 