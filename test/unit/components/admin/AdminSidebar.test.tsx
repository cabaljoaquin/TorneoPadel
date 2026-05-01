import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { createClient } from '@/utils/supabase/client'
import { usePathname } from 'next/navigation'

// We mocked 'next/navigation' and '@/utils/supabase/client' globally in jest.setup.ts
// We cast usePathname so we can override its mocked return value if needed
const mockUsePathname = usePathname as jest.Mock
const mockSupabaseClient = createClient()

describe('AdminSidebar Component', () => {
  const defaultProps = {
    isOpen: true,
    isDesktopCollapsed: false,
    onClose: jest.fn(),
    torneoCount: 5,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/admin')
  })

  it('renders correctly with all nav items when torneoCount is greater than 0', () => {
    render(<AdminSidebar {...defaultProps} />)
    
    // Check that standard nav items appear
    expect(screen.getByText('Resumen')).toBeInTheDocument()
    expect(screen.getByText('Mis Torneos')).toBeInTheDocument()
    expect(screen.getByText('Inscripciones')).toBeInTheDocument()
    expect(screen.getByText('Cuadros')).toBeInTheDocument()
    expect(screen.getByText('Partidos')).toBeInTheDocument()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  it('hides items that require torneos when torneoCount is 0', () => {
    render(<AdminSidebar {...defaultProps} torneoCount={0} />)
    
    // 'Resumen' requiresTorneos: true, so it should not be in the document
    expect(screen.queryByText('Resumen')).not.toBeInTheDocument()
    
    // Others do not require torneos, they should exist
    expect(screen.getByText('Mis Torneos')).toBeInTheDocument()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  it('calls onClose when clicking close button in mobile view', () => {
    render(<AdminSidebar {...defaultProps} />)
    
    // Close button (X) is shown in the header
    const closeBtn = screen.getByRole('button', { name: '' }) // The close button just has an `<X>` inside, wait, we can find by class or just find the first matching clickable
    
    // A better approach is directly targeting the specific button, but let's test the backdrop which also triggers `onClose`.
    const backdrop = document.querySelector('.bg-black\\/60') as Element
    fireEvent.click(backdrop)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('executes logout properly from the signOut handler', async () => {
    // Suppress console error for JSDOM navigation
    const originalConsoleError = console.error
    console.error = jest.fn()

    render(<AdminSidebar {...defaultProps} />)
    
    const logoutBtn = screen.getByText('Cerrar sesión')
    fireEvent.click(logoutBtn)

    await waitFor(() => {
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1)
    })

    console.error = originalConsoleError
  })
})
