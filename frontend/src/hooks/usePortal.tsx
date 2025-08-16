import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function usePortal(id: string = 'portal-root') {
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    let element = document.getElementById(id)
    
    if (!element) {
      element = document.createElement('div')
      element.id = id
      element.style.position = 'relative'
      element.style.zIndex = '9999'
      document.body.appendChild(element)
    }
    
    setPortalElement(element)
    
    return () => {
      // Nettoyer seulement si l'élément est vide
      if (element && element.children.length === 0 && element.parentNode) {
        element.parentNode.removeChild(element)
      }
    }
  }, [id])

  const Portal = ({ children }: { children: React.ReactNode }) => {
    if (!portalElement) return null
    return createPortal(children, portalElement)
  }

  return Portal
}
