import React, { useEffect, useRef, useState } from 'react'
import { usePortal } from '../hooks/usePortal'

interface DropdownProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  offset?: { x: number; y: number }
}

export default function Dropdown({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = '',
  align = 'left',
  offset = { x: 0, y: 4 }
}: DropdownProps) {
  const Portal = usePortal('dropdown-portal')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

  // Calculer la position du dropdown
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      if (!triggerRef.current) return

      const triggerRect = triggerRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let left = triggerRect.left + offset.x
      let top = triggerRect.bottom + offset.y
      const width = triggerRect.width

      // Ajustements pour l'alignement
      if (align === 'right') {
        left = triggerRect.right - width + offset.x
      } else if (align === 'center') {
        left = triggerRect.left + (triggerRect.width / 2) - (width / 2) + offset.x
      }

      // Vérifier si le dropdown dépasse à droite
      if (dropdownRef.current) {
        const dropdownWidth = dropdownRef.current.offsetWidth
        if (left + dropdownWidth > viewportWidth) {
          left = viewportWidth - dropdownWidth - 16 // 16px de marge
        }
      }

      // Vérifier si le dropdown dépasse en bas
      if (dropdownRef.current) {
        const dropdownHeight = dropdownRef.current.offsetHeight
        if (top + dropdownHeight > viewportHeight) {
          top = triggerRect.top - dropdownHeight - offset.y
        }
      }

      // S'assurer que left n'est pas négatif
      left = Math.max(16, left)

      setPosition({ top, left, width })
    }

    updatePosition()
    
    // Recalculer lors du redimensionnement ou du défilement (mais pas du scroll interne)
    const handleResize = () => updatePosition()
    const handleScroll = (event: Event) => {
      // Ne pas repositionner si le scroll vient du dropdown lui-même
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return
      }
      updatePosition()
    }
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, triggerRef, align, offset.x, offset.y])

  // Fermer au clic extérieur
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  return (
    <Portal>
      <div
        ref={dropdownRef}
        className={`fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl 
                    animate-in slide-in-from-top-2 duration-200 ${className}`}
        style={{
          top: position.top,
          left: position.left,
          minWidth: position.width,
          zIndex: 9999
        }}
      >
        {children}
      </div>
    </Portal>
  )
}
