import React from 'react'
import { Link } from 'react-router-dom'

const STEPS = [
  {
    n: '1',
    title: 'Crea tu cuenta gratis',
    body: 'Regístrate en segundos y recibe 1,000 PT (puntos virtuales) de bienvenida para empezar a predecir.',
  },
  {
    n: '2',
    title: 'Elige un mercado',
    body: 'Explora mercados sobre política, deportes, economía y más. Cada uno es una pregunta de SÍ o NO.',
  },
  {
    n: '3',
    title: 'Predice SÍ o NO',
    body: 'Compra acciones del lado que crees que va a pasar. El precio refleja la probabilidad que el mercado le da.',
  },
  {
    n: '4',
    title: 'Gana puntos si aciertas',
    body: 'Cuando el evento se resuelve, cada acción ganadora vale 100 PT. Sube en la clasificación con tus aciertos.',
  },
]

const FAQ = [
  {
    q: '¿Se juega con dinero real?',
    a: 'No. VEREDIKT opera 100% con puntos virtuales (PT). No hay depósitos, retiros ni apuestas con dinero real. Es solo por diversión y para medir tu instinto.',
  },
  {
    q: '¿Cómo se deciden los precios?',
    a: 'El precio de SÍ es la probabilidad estimada por el mercado (de 1% a 99%). Cuando la gente compra SÍ, sube; cuando compra NO, baja.',
  },
  {
    q: '¿Cuánto puedo ganar?',
    a: 'Cada acción que aciertas paga 100 PT. Si compras SÍ a 40% (40 PT por acción) y aciertas, ganas 100 PT por acción: una ganancia de 60 PT.',
  },
]

export function HowItWorks() {
  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 24px' }}>
      <div className="anim-1" style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px' }}>
          Cómo funciona
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          VEREDIKT es un mercado de predicciones con puntos virtuales. Predice eventos reales,
          compite y demuestra qué tan bien lees el futuro — sin arriesgar un solo peso.
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
        {STEPS.map((s, i) => (
          <div key={s.n} className={`card anim-${Math.min(i + 1, 6)}`} style={{ display: 'flex', gap: 18, padding: '22px 24px', alignItems: 'flex-start' }}>
            <div style={{
              flexShrink: 0, width: 42, height: 42, borderRadius: 12,
              background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'DM Mono', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gold)',
            }}>
              {s.n}
            </div>
            <div>
              <h3 className="font-display" style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {s.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 48 }}>
        <div className="exchange-header" style={{ marginBottom: 18 }}>Preguntas frecuentes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ.map(f => (
            <div key={f.q} className="card" style={{ padding: '20px 24px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.q}</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <Link to="/mercados" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'var(--oro)', border: 'none', padding: '15px 36px',
            color: '#07071A', fontFamily: 'DM Sans', fontWeight: 800,
            fontSize: '0.9rem', letterSpacing: '0.06em', borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(255, 215, 0, 0.25)',
          }}>
            EXPLORAR MERCADOS →
          </button>
        </Link>
      </div>
    </div>
  )
}
