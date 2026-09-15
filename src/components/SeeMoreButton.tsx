import React from 'react'
import { useTranslation } from 'react-i18next'

// "Ver más mercados (N restantes)": paginado en cliente de Home y Noticias.
export function SeeMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <div style={{ textAlign: 'center', marginTop: 24 }}>
      <button className="btn btn-secondary" onClick={onClick} style={{ minHeight: 44, padding: '0 24px' }}>
        {t('home.seeMore', { count: remaining })}
      </button>
    </div>
  )
}
