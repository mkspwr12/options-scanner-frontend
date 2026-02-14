"use client"

import { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''
const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// Simple logger that also displays in UI
const log = (level: 'info' | 'error' | 'debug', message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`
  console.log(logEntry, data || '')
  
  // Send to backend for centralized logging
  if (typeof window !== 'undefined') {
    fetch(`${API_BASE}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, data, timestamp, source: 'frontend' })
    }).catch(() => {}) // Silently fail if backend not available
  }
}

export default function HomePage() {
  const [health, setHealth] = useState<'checking' | 'ok' | 'error'>('checking')
  const [healthDetail, setHealthDetail] = useState<string>('')
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [apiBase, setApiBase] = useState<string>('')

  const addDebugLog = (message: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    log('debug', message)
  }

  useEffect(() => {
    const check = async () => {
      addDebugLog(`Frontend initialized. API_BASE: "${API_BASE}"`)
      setApiBase(API_BASE)
      
      if (!API_BASE) {
        const msg = 'ERROR: NEXT_PUBLIC_API_BASE is not set. Backend will not be reachable. Set it during build with: NEXT_PUBLIC_API_BASE=https://your-backend.azurewebsites.net npm run build'
        setHealth('error')
        setHealthDetail(msg)
        addDebugLog(msg)
        log('error', 'API_BASE not configured', { API_BASE })
        return
      }

      try {
        addDebugLog(`Attempting to connect to health endpoint: ${API_BASE}/health`)
        const response = await fetch(`${API_BASE}/health`)
        addDebugLog(`Health endpoint response: ${response.status} ${response.statusText}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        setHealth('ok')
        setHealthDetail('Backend connected')
        addDebugLog('✓ Backend connection successful')

        // Fetch scan data
        addDebugLog(`Fetching scan data from ${API_BASE}/api/scan`)
        const scanResponse = await fetch(`${API_BASE}/api/scan`)
        addDebugLog(`Scan response: ${scanResponse.status}`)
        if (scanResponse.ok) {
          const scanData = await scanResponse.json()
          addDebugLog(`✓ Received ${scanData.opportunities?.length || 0} opportunities`)
          setOpportunities(scanData.opportunities || [])
        } else {
          addDebugLog(`⚠ Scan endpoint returned ${scanResponse.status}`)
        }

        // Fetch portfolio data
        addDebugLog(`Fetching portfolio from ${API_BASE}/api/portfolio`)
        const portfolioResponse = await fetch(`${API_BASE}/api/portfolio`)
        addDebugLog(`Portfolio response: ${portfolioResponse.status}`)
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json()
          addDebugLog(`✓ Received portfolio data`)
          setPortfolio(portfolioData.portfolio || null)
        } else {
          addDebugLog(`⚠ Portfolio endpoint returned ${portfolioResponse.status}`)
        }

        // Fetch watchlist
        addDebugLog(`Fetching watchlist from ${API_BASE}/api/watchlist`)
        const watchlistResponse = await fetch(`${API_BASE}/api/watchlist`)
        addDebugLog(`Watchlist response: ${watchlistResponse.status}`)
        if (watchlistResponse.ok) {
          const watchlistData = await watchlistResponse.json()
          addDebugLog(`✓ Received ${watchlistData.symbols?.length || 0} watchlist symbols`)
          setWatchlist(watchlistData.symbols || [])
        } else {
          addDebugLog(`⚠ Watchlist endpoint returned ${watchlistResponse.status}`)
        }
      } catch (error: any) {
        setHealth('error')
        const errorMsg = error?.message || String(error)
        setHealthDetail(`Backend unavailable: ${errorMsg}`)
        addDebugLog(`✗ ERROR: ${errorMsg}`)
        log('error', 'Failed to connect to backend', { error: errorMsg, apiBase: API_BASE })
      }
    }

    check()
  }, [])

  return (
    <main>
      <h1>Options Scanner</h1>
      <p>Next.js frontend scaffold with FastAPI backend integration.</p>

      <div className="status" style={{ 
        padding: '12px',
        marginBottom: '16px',
        borderRadius: '4px',
        backgroundColor: health === 'error' ? '#fee' : health === 'ok' ? '#efe' : '#fef',
        borderLeft: `4px solid ${health === 'error' ? '#f00' : health === 'ok' ? '#0f0' : '#00f'}`
      }}>
        <span>Backend status:</span>
        <strong style={{ marginLeft: '8px' }}>
          {health === 'checking' && '🔄 Checking...'}
          {health === 'ok' && '✓ Connected'}
          {health === 'error' && '✗ Unavailable'}
        </strong>
        {healthDetail && <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>{healthDetail}</div>}
        {apiBase && <div style={{ marginTop: '8px', fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>API: {apiBase}</div>}
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

      {/* Diagnostics Section */}
      <section style={{ 
        marginTop: '32px',
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>📊 Diagnostics & Debug Logs</h2>
        
        <div style={{ 
          fontFamily: 'monospace',
          fontSize: '11px',
          backgroundColor: '#222',
          color: '#0f0',
          padding: '12px',
          borderRadius: '4px',
          maxHeight: '300px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {debugLogs.length === 0 ? (
            <div>Waiting for initialization...</div>
          ) : (
            debugLogs.map((log, i) => (
              <div key={i} style={{
                color: log.includes('ERROR') || log.includes('✗') ? '#f44' : 
                       log.includes('✓') ? '#4f4' :
                       log.includes('⚠') ? '#fa4' : '#0f0'
              }}>
                {log}
              </div>
            ))
          )}
        </div>

        <details style={{ marginTop: '12px' }}>
          <summary style={{ cursor: 'pointer', color: '#666', fontSize: '12px' }}>
            📋 Configuration Info
          </summary>
          <div style={{ marginTop: '8px', fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
            <div>API Base: <strong>{apiBase || '(not set)'}</strong></div>
            <div>Environment: <strong>{isDev ? 'development' : 'production'}</strong></div>
            <div>Hostname: <strong>{typeof window !== 'undefined' ? window.location.hostname : '(ssr)'}</strong></div>
            <div>Backend Status: <strong>{health}</strong></div>
          </div>
        </details>
      </section>
    </main>
  )
