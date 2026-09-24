import { useTranslation } from 'react-i18next'
import type { Category, Market } from '../../types'
import { getCategoryColor } from '../../lib/categoryColors'
import { Icon } from '../Icon'
import { politicaLandingAvailable } from '../politica/PoliticaLanding'
import { deportesLandingAvailable } from '../deportes/DeportesLanding'
import { cryptoLandingAvailable } from '../crypto/CryptoLanding'

// Primera celda del grid de Deportes, Política y Crypto (estilo Polymarket): abre
// in-place la landing con gráficas de la categoría. Mide lo mismo que MarketCard.
export function PanelCard({ category, markets, onOpen }: { category: Category; markets: Market[]; onOpen: () => void }) {
  const { t } = useTranslation()
  const k = category as 'Política' | 'Deportes' | 'Crypto'  // solo las de tienePanel
  const abiertos = markets.filter(m => m.category === category && m.status === 'open').length
  return (
    <button type="button" className="card market-card panel-card anim-1" onClick={onOpen}>
      <span className="panel-card-title">
        {t(`panel.${k}.titulo`)}
        <span style={{ display: 'block', color: getCategoryColor(category) }}>{t(`panel.${k}.subtitulo`)}</span>
      </span>
      <span className="meta-label panel-card-foot">
        <span className="num">{t('panel.abiertos', { count: abiertos })}</span>
        <span className="panel-card-cta">{t('panel.ver')}<Icon name="arrow-right" size={14} /></span>
      </span>
    </button>
  )
}

// ¿La landing con gráficas tiene qué mostrar? (misma regla de siempre: un trending abierto)
export function panelDisponible(category: string, markets: Market[], loading: boolean): boolean {
  if (category === 'Política') return politicaLandingAvailable(markets, loading)
  if (category === 'Deportes') return deportesLandingAvailable(markets, loading)
  if (category === 'Crypto') return cryptoLandingAvailable(markets, loading)
  return false
}

// «← Todos los mercados de Deportes» sobre la landing abierta: regresa al grid
export function PanelBack({ category, onBack }: { category: Category; onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16, paddingLeft: 0 }}>
      <Icon name="arrow-left" size={14} />{t('panel.volver', { category })}
    </button>
  )
}
