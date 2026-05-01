'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Cerrar al clickear afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 bg-surface-card border ${
          isOpen ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-surface-border'
        } rounded-lg text-sm text-left flex items-center justify-between transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500 focus:outline-none'
        }`}
      >
        <span className={selectedOption ? 'text-slate-100' : 'text-slate-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface-card border border-surface-border rounded-xl shadow-xl overflow-hidden animate-fade-in p-1">
          <div className="max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`w-full px-3 py-2.5 text-sm text-left flex items-center justify-between rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-brand-500/10 text-brand-400 font-medium'
                      : 'text-slate-200 hover:bg-surface-hover hover:text-white'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={16} className="text-brand-400 shrink-0 ml-2" />}
                </button>
              )
            })}
            {options.length === 0 && (
              <div className="px-3 py-3 text-sm text-slate-500 text-center">
                Sin opciones
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
