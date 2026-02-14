"use client"

import { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

export default function HomePage() {
  const [health, setHealth] = useState<'checking' | 'ok' | 'error'>('checking')
  const [healthDetail, setHealthDetail] = useState<string>('')
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>([])

  useEffect(() => {
    const check = async () => {
      if (!API_BASE) {
        setHealth('error')
        setHealthDetail('NEXT_PUBLIC_API_BASE is not set')
        return
      }

      try {
        const response = await fetch(`${API_BASE}/health`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        setHealth('ok')
        setHealthDetail('Backend connected')
        const scanResponse = await fetch(`${API_BASE}/api/scan`)
        if (scanResponse.ok) {
          const scanData = await scanResponse.json()
          setOpportunities(scanData.opportunities || [])
        }

        const portfolioResponse = await fetch(`${API_BASE}/api/portfolio`)
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json()
          setPortfolio(portfolioData.portfolio || null)
        }

        const watchlistResponse = await fetch(`${API_BASE}/api/watchlist`)
        if (watchlistResponse.ok) {
          const watchlistData = await watchlistResponse.json()
          setWatchlist(watchlistData.symbols || [])
        }
      } catch (error) {
        setHealth('error')
        setHealthDetail('Backend unavailable')
      }
    }

    check()
  }, [])

  return (
    <main>
      <h1>Options Scanner</h1>
      <p>Next.js frontend scaffold with FastAPI backend integration.</p>

      <div className="status">
        <span>Backend status:</span>
        <strong>
          {health === 'checking' && 'Checking...'}
          {health === 'ok' && 'Connected'}
          {health === 'error' && 'Unavailable'}
        </strong>
        <span className="muted">{healthDetail}</span>
      </div>

      <section className="card-grid">
        <div className="card">
          <h3>Scanner</h3>
          <p className="muted">Latest opportunities from FastAPI.</p>
          {opportunities.length === 0 ? (
            <p className="muted">No scan results yet.</p>
          ) : (
            <ul className="muted">
              {opportunities.slice(0, 3).map((opp) => (
                <li key={opp.id}>
                  {opp.symbol} {opp.optionType} {opp.strikePrice} @ ${opp.currentPrice}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3>Portfolio</h3>
          <p className="muted">Positions and P/L from SQL.</p>
          {portfolio ? (
            <div className="muted">
              <div>Total Value: ${portfolio.metrics.totalValue}</div>
              <div>Open Trades: {portfolio.metrics.activeTrades}</div>
              <div>Win Rate: {portfolio.metrics.winRate}%</div>
            </div>
          ) : (
            <p className="muted">No portfolio data yet.</p>
          )}
        </div>
        <div className="card">
          <h3>Watchlist</h3>
          <p className="muted">Tracked symbols from backend.</p>
          {watchlist.length === 0 ? (
            <p className="muted">No watchlist symbols yet.</p>
          ) : (
            <p className="muted">{watchlist.join(', ')}</p>
          )}
        </div>
      </section>
    </main>
  )
}
