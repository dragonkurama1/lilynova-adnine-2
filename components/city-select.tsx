'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { CITY_NAMES } from '@/lib/cities'

interface CitySelectProps {
  value: string
  onChange: (city: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  id?: string
}

/**
 * Searchable dropdown for Moroccan cities (filter).
 * - Tape quelques lettres pour filtrer la liste (~417 villes)
 * - Sélection par clic ou via clavier (flèches + Entrée)
 */
export function CitySelect({
  value,
  onChange,
  placeholder = 'Sélectionnez votre ville…',
  className,
  inputClassName,
  id,
}: CitySelectProps) {
  const [query, setQuery] = useState(value || '')
  const [isOpen, setIsOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  // Sync when parent resets value
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return CITY_NAMES
    return CITY_NAMES.filter(c => c.includes(q))
  }, [query])

  // Close on click outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selectCity = (city: string) => {
    onChange(city)
    setQuery(city)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlight]) selectCity(filtered[highlight])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }} className={className}>
      <input
        id={id}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={e => {
          setQuery(e.target.value)
          setHighlight(0)
          setIsOpen(true)
          // Si l'utilisateur tape manuellement, on vide la ville sélectionnée
          // tant qu'il n'a pas confirmé une valeur de la liste
          onChange('')
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={
          inputClassName ||
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
        }
      />
      {isOpen && (
        <ul
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            maxHeight: 240,
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
            padding: 4,
            margin: 0,
            listStyle: 'none',
          }}
        >
          {filtered.length === 0 ? (
            <li
              style={{
                padding: '8px 10px',
                fontSize: 13,
                color: '#9ca3af',
                textAlign: 'center',
              }}
            >
              Aucune ville trouvée
            </li>
          ) : (
            filtered.slice(0, 200).map((city, idx) => (
              <li
                key={city}
                onMouseDown={e => {
                  e.preventDefault()
                  selectCity(city)
                }}
                onMouseEnter={() => setHighlight(idx)}
                style={{
                  padding: '6px 10px',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 6,
                  backgroundColor: highlight === idx ? '#f3f4f6' : 'transparent',
                  color: '#1f2937',
                  fontWeight: value === city ? 700 : 400,
                }}
              >
                {city}
              </li>
            ))
          )}
          {filtered.length > 200 && (
            <li
              style={{
                padding: '6px 10px',
                fontSize: 11,
                color: '#9ca3af',
                textAlign: 'center',
              }}
            >
              Affinez votre recherche pour voir plus de résultats…
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
