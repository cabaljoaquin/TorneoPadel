import { proxy } from '@/proxy'
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      return {
        nextUrl: new URL(url),
        headers: new Headers(init?.headers),
      }
    }),
    NextResponse: {
      next: jest.fn().mockImplementation((options) => {
        return {
          status: 200,
          headers: new Headers(options?.request?.headers),
        }
      }),
      redirect: jest.fn().mockImplementation((url: string) => {
        const headers = new Headers()
        headers.set('location', url)
        return { status: 302, headers }
      }),
    },
  }
})

jest.mock('@/utils/supabase/middleware', () => ({
  updateSession: jest.fn(),
}))

describe('proxy middleware', () => {
  const mockUpdateSession = updateSession as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('injects x-pathname header before processing and into the response', async () => {
    const request = new NextRequest('http://localhost/admin/dashboard')
    
    // updateSession returns a normal response (status 200)
    const mockResponse = NextResponse.next({ request })
    mockUpdateSession.mockResolvedValue(mockResponse)

    const response = await proxy(request as any)

    // Checks header injected in request before updateSession
    expect(request.headers.get('x-pathname')).toBe('/admin/dashboard')

    // Checks updateSession was called with the modified request
    expect(mockUpdateSession).toHaveBeenCalledWith(request)

    // Checks header was injected in response
    expect(response.headers.get('x-pathname')).toBe('/admin/dashboard')
    expect(response.status).toBe(200)
  })

  it('preserves redirects (skips adding header if status is not 200 or has location header)', async () => {
    const request = new NextRequest('http://localhost/admin/protected')
    
    // Simulating unauthenticated layout resolving to a redirect
    const mockRedirectResponse = NextResponse.redirect('http://localhost/login')
    mockUpdateSession.mockResolvedValue(mockRedirectResponse)

    const response = await proxy(request as any)

    // x-pathname is injected into Request before updateSession check
    expect(request.headers.get('x-pathname')).toBe('/admin/protected')

    // Redirect preserves original status and does NOT inject to the final response
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('http://localhost/login')
    expect(response.headers.get('x-pathname')).toBeNull()
  })

  it('preserves other non-200 responses without modifying them', async () => {
    const request = new NextRequest('http://localhost/error-route')
    
    const mockErrorResponse = {
      status: 500,
      headers: new Headers()
    }
    mockUpdateSession.mockResolvedValue(mockErrorResponse)

    const response = await proxy(request as any)

    expect(response.status).toBe(500)
    expect(response.headers.get('x-pathname')).toBeNull() // Not modified
  })
})
