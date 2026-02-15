"use client"

import { useEffect, useState } from 'react'
import { ScannerSection } from './components/scanner/ScannerSection'
import type { ScanResult } from './types/scanner'

const DEFAULT_API_BASE = 'https://options-scanner-backend-2exk6s.azurewebsites.net'
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API_BASE
const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const POLL_INTERVAL_MS = 60000

// Simple logger that also displays in UI
const log = (level: 'info' | 'error' | 'debug', message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`
  console.log(logEntry, data || '')
  
  // Send to backend for centralized logging
  if (typeof window !== 'undefined' && API_BASE) {
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
  const [dbHealth, setDbHealth] = useState<'checking' | 'ok' | 'error'>('checking')
  const [dbDetail, setDbDetail] = useState<string>('')
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [trackedTrades, setTrackedTrades] = useState<any[]>([])
  const [multiLegOpportunities, setMultiLegOpportunities] = useState<any[]>([])
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [apiBase, setApiBase] = useState<string>(API_BASE)
  const [showStatus, setShowStatus] = useState<boolean>(false)
  const [isScanning, setIsScanning] = useState<boolean>(false)

  const addDebugLog = (message: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    log('debug', message)
  }

  const fetchScanData = async (source: 'init' | 'manual' | 'poll') => {
    try {
      addDebugLog(`🔍 ${source === 'manual' ? 'Manual' : 'Auto'} scan: ${API_BASE}/api/scan`)
      const scanResponse = await fetch(`${API_BASE}/api/scan`)
      addDebugLog(`Scan response: ${scanResponse.status}`)
      if (scanResponse.ok) {
        const scanData = await scanResponse.json()
        addDebugLog(`✓ Received ${scanData.opportunities?.length || 0} opportunities`)
        setOpportunities(scanData.opportunities || [])
      } else {
        addDebugLog(`⚠ Scan endpoint returned ${scanResponse.status}`)
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      addDebugLog(`✗ Scan fetch error: ${errorMsg}`)
    }
  }

  const fetchPortfolioData = async (source: 'init' | 'poll') => {
    try {
      addDebugLog(`💼 ${source === 'poll' ? 'Auto' : 'Init'} portfolio: ${API_BASE}/api/portfolio`)
      const portfolioResponse = await fetch(`${API_BASE}/api/portfolio`)
      addDebugLog(`Portfolio response: ${portfolioResponse.status}`)
      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json()
        addDebugLog('✓ Received portfolio data')
        setPortfolio(portfolioData.portfolio || null)
      } else {
        addDebugLog(`⚠ Portfolio endpoint returned ${portfolioResponse.status}`)
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      addDebugLog(`✗ Portfolio fetch error: ${errorMsg}`)
    }
  }

  const fetchMultiLegData = async (source: 'init' | 'poll') => {
    try {
      addDebugLog(`🎯 ${source === 'poll' ? 'Auto' : 'Init'} multi-leg: ${API_BASE}/api/multi-leg-opportunities`)
      const multiLegResponse = await fetch(`${API_BASE}/api/multi-leg-opportunities`)
      addDebugLog(`Multi-leg response: ${multiLegResponse.status}`)
      if (multiLegResponse.ok) {
        const multiLegData = await multiLegResponse.json()
        addDebugLog(`✓ Received ${multiLegData.opportunities?.length || 0} multi-leg opportunities`)
        setMultiLegOpportunities(multiLegData.opportunities || [])
      } else if (multiLegResponse.status !== 404) {
        addDebugLog(`⚠ Multi-leg endpoint returned ${multiLegResponse.status}`)
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      if (!errorMsg.includes('404')) {
        addDebugLog(`⚠ Multi-leg fetch error: ${errorMsg}`)
      }
    }
  }

  const runScan = async () => {
    setIsScanning(true)
    try {
      await fetchScanData('manual')
    } finally {
      setIsScanning(false)
    }
  }

  const trackTrade = (opportunity: any, quantity: number) => {
    const newTrade = {
      id: `trade-${Date.now()}`,
      opportunityId: opportunity.id,
      symbol: opportunity.symbol,
      strikePrice: opportunity.strikePrice,
      expirationDate: opportunity.expirationDate,
      optionType: opportunity.optionType,
      entryPrice: opportunity.currentPrice,
      currentPrice: opportunity.currentPrice,
      quantity,
      underlyingPrice: opportunity.underlyingPrice,
      greeks: opportunity.greeks,
      entryDate: Date.now(),
      unrealizedPL: 0,
      unrealizedPLPercent: 0,
      status: 'active'
    }
    setTrackedTrades(prev => [...prev, newTrade])
    addDebugLog(`✓ Tracked trade: ${opportunity.symbol} ${opportunity.optionType} x${quantity}`)
  }

  const closeTrade = (tradeId: string, exitPrice: number) => {
    const trade = trackedTrades.find(t => t.id === tradeId)
    if (!trade) return
    
    const realizedPL = (exitPrice - trade.entryPrice) * trade.quantity * 100
    const realizedPLPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100
    
    setTrackedTrades(prev => prev.filter(t => t.id !== tradeId))
    addDebugLog(`✓ Closed trade: ${trade.symbol} - P/L: ${realizedPL >= 0 ? '+' : ''}$${realizedPL.toFixed(2)}`)
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

      setHealth('checking')
      setDbHealth('checking')
      setHealthDetail('')
      setDbDetail('')

      // Check app health (no DB dependency)
      try {
        addDebugLog(`Attempting app health check: ${API_BASE}/healthz`)
        const appHealth = await fetch(`${API_BASE}/healthz`)
        addDebugLog(`Healthz response: ${appHealth.status} ${appHealth.statusText}`)
        if (!appHealth.ok) {
          throw new Error(`HTTP ${appHealth.status}: ${appHealth.statusText}`)
        }
        setHealth('ok')
        setHealthDetail('Backend reachable')
        addDebugLog('✓ Backend reachable')
      } catch (error: any) {
        const errorMsg = error?.message || String(error)
        setHealth('error')
        setHealthDetail(`Backend unreachable: ${errorMsg}`)
        addDebugLog(`✗ Healthz error: ${errorMsg}`)
      }

      // Check DB health (optional)
      try {
        addDebugLog(`Attempting DB health check: ${API_BASE}/health`)
        const dbHealthResponse = await fetch(`${API_BASE}/health`)
        addDebugLog(`Health response: ${dbHealthResponse.status} ${dbHealthResponse.statusText}`)
        if (!dbHealthResponse.ok) {
          throw new Error(`HTTP ${dbHealthResponse.status}: ${dbHealthResponse.statusText}`)
        }
        setDbHealth('ok')
        setDbDetail('Database connected')
        addDebugLog('✓ Database connection successful')
      } catch (error: any) {
        const errorMsg = error?.message || String(error)
        setDbHealth('error')
        setDbDetail(`Database unavailable: ${errorMsg}`)
        addDebugLog(`⚠ DB health error: ${errorMsg}`)
      }

      // Fetch scan and portfolio data
      await fetchScanData('init')
      await fetchPortfolioData('init')

      // Fetch watchlist
      try {
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
        const errorMsg = error?.message || String(error)
        addDebugLog(`✗ Watchlist fetch error: ${errorMsg}`)
      }

      await fetchMultiLegData('init')
    }

    check()
  }, [])

  useEffect(() => {
    if (!API_BASE) return

    const interval = setInterval(() => {
      fetchScanData('poll')
      fetchPortfolioData('poll')
      fetchMultiLegData('poll')
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0' }}>Options Scanner</h1>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Real-time trade analysis and portfolio tracking</p>
        </div>
        <button 
          onClick={runScan}
          disabled={isScanning}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            opacity: isScanning ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          {isScanning ? '🔄 Scanning...' : '🔍 Run Scan'}
        </button>
      </div>

      {/* Status Section - Collapsible */}
      <details style={{ marginBottom: '20px', cursor: 'pointer' }}>
        <summary style={{ 
          padding: '12px 16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '13px',
          color: '#333',
          userSelect: 'none'
        }}>
          ⚙️ System Status {health === 'ok' ? '✓' : '⚠'} — Click to expand
        </summary>
        
        <div className="status" style={{ 
          padding: '16px',
          marginTop: '12px',
          borderRadius: '6px',
          backgroundColor: health === 'error' ? '#ffebee' : health === 'ok' ? '#e8f5e9' : '#f3e5f5',
          borderLeft: `6px solid ${health === 'error' ? '#d32f2f' : health === 'ok' ? '#388e3c' : '#7c4dff'}`,
        color: '#1a1a1a',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '15px' }}>Backend Status</div>
        <strong style={{ marginLeft: '0px', fontSize: '14px' }}>
          {health === 'checking' && '🔄 Checking...'}
          {health === 'ok' && '✓ Connected'}
          {health === 'error' && '✗ Unavailable'}
        </strong>
        {healthDetail && <div style={{ marginTop: '8px', fontSize: '13px', color: '#555', fontStyle: 'italic' }}>{healthDetail}</div>}
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '15px' }}>Database Status</div>
          <strong style={{ marginLeft: '0px', fontSize: '14px' }}>
            {dbHealth === 'checking' && '🔄 Checking...'}
            {dbHealth === 'ok' && '✓ Connected'}
            {dbHealth === 'error' && '✗ Unavailable'}
          </strong>
          {dbDetail && <div style={{ marginTop: '6px', fontSize: '12px', color: '#555', backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px 10px', borderRadius: '3px', fontFamily: 'monospace', maxHeight: '60px', overflow: 'auto' }}>{dbDetail}</div>}
        </div>
        {apiBase && <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', color: '#666', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.02)', padding: '8px 10px', borderRadius: '3px' }}>API: {apiBase}</div>}
      </div>
      </details>

      <section className="card-grid">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>🔍 Scanner — Advanced Filtering</h3>
          <ScannerSection onTrack={(result: ScanResult) => {
            const quantity = prompt(`Enter quantity for ${result.symbol} ${result.optionType}:`, '1')
            if (quantity) {
              const newTrade = {
                id: `trade-${Date.now()}`,
                opportunityId: '',
                symbol: result.symbol,
                strikePrice: result.strike,
                expirationDate: result.expiration,
                optionType: result.optionType,
                entryPrice: result.last,
                currentPrice: result.last,
                quantity: parseFloat(quantity),
                underlyingPrice: result.underlyingPrice,
                greeks: { delta: result.delta, theta: result.theta, vega: result.vega, gamma: result.gamma },
                entryDate: Date.now(),
                unrealizedPL: 0,
                unrealizedPLPercent: 0,
                status: 'active'
              }
              setTrackedTrades(prev => [...prev, newTrade])
              addDebugLog(`✓ Tracked trade: ${result.symbol} ${result.optionType} x${quantity}`)
            }
          }} />
        </div>
      </section>

      <section className="card-grid" style={{ marginTop: '0' }}>
        <div className="card">
          <h3>💼 Portfolio</h3>
          <p className="muted">Positions and P/L from backend</p>
          {portfolio ? (
            <div className="muted">
              <div><strong>Total Value:</strong> ${portfolio.metrics?.totalValue?.toFixed(2)}</div>
              <div><strong>Unrealized P/L:</strong> ${portfolio.metrics?.totalPL?.toFixed(2)} ({portfolio.metrics?.totalPLPercent?.toFixed(2)}%)</div>
              <div><strong>Active Trades:</strong> {portfolio.metrics?.activeTrades}</div>
              <div><strong>Win Rate:</strong> {portfolio.metrics?.winRate?.toFixed(1)}%</div>
              {portfolio.trades && portfolio.trades.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px' }}>
                  <strong>Positions:</strong>
                  {portfolio.trades.map((trade: any) => (
                    <div key={trade.id} style={{ padding: '4px', backgroundColor: '#f9f9f9', marginTop: '4px', borderRadius: '3px' }}>
                      {trade.symbol} {trade.optionType} - Entry: ${trade.entryPrice}, Current: ${trade.currentPrice}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="muted">No portfolio data yet.</p>
          )}
        </div>

        <div className="card">
          <h3>⭐ Watchlist</h3>
          <p className="muted">Tracked symbols</p>
          {watchlist.length === 0 ? (
            <div className="muted">
              <p>No symbols tracked.</p>
              <input 
                type="text" 
                placeholder="Add symbol (e.g., AAPL)"
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter' && e.target.value) {
                    setWatchlist([...watchlist, e.target.value.toUpperCase()])
                    e.target.value = ''
                  }
                }}
                style={{ padding: '6px', width: '100%', marginTop: '8px', borderRadius: '3px', border: '1px solid #ccc' }}
              />
            </div>
          ) : (
            <div>
              {watchlist.map((symbol: string) => (
                <div key={symbol} style={{ padding: '6px', backgroundColor: '#e3f2fd', marginBottom: '4px', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{symbol}</strong>
                  <button 
                    onClick={() => setWatchlist(watchlist.filter((s: string) => s !== symbol))}
                    style={{ padding: '2px 6px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#f44', color: 'white', border: 'none', borderRadius: '2px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <input 
                type="text" 
                placeholder="Add symbol"
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter' && e.target.value) {
                    setWatchlist([...watchlist, e.target.value.toUpperCase()])
                    e.target.value = ''
                  }
                }}
                style={{ padding: '6px', width: '100%', marginTop: '8px', borderRadius: '3px', border: '1px solid #ccc' }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Multi-Leg Opportunities Section */}
      {multiLegOpportunities && multiLegOpportunities.length > 0 && (
        <section style={{ marginTop: '24px', padding: '16px', backgroundColor: '#ffe2b8', borderRadius: '6px', border: '1px solid #e38a00' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#4e2f00' }}>🎯 Multi-Leg Opportunities</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {multiLegOpportunities.map((opp: any) => (
              <div key={opp.id} style={{ backgroundColor: '#fffdf6', padding: '12px', borderRadius: '4px', border: '1px solid #e38a00', color: '#2b1f0f' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#3a2408' }}>
                  {opp.strategyType}: {opp.symbol}
                </div>
                <div style={{ fontSize: '12px', color: '#4d3b2b', marginBottom: '8px' }}>
                  <div>Max Profit: ${opp.maxProfit?.toFixed(2)}</div>
                  <div>Max Loss: ${Math.abs(opp.maxLoss || 0).toFixed(2)}</div>
                  <div>Breakeven: ${opp.breakeven?.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#6b5a4a', marginBottom: '8px' }}>
                  Legs: {opp.legs?.length || 0}
                </div>
                <button 
                  onClick={() => setMultiLegOpportunities(multiLegOpportunities.filter((o: any) => o.id !== opp.id))}
                  style={{ padding: '6px 12px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#d46f00', color: 'white', border: 'none', borderRadius: '3px' }}
                >
                  Execute Strategy
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Trades Section */}
      {trackedTrades && trackedTrades.length > 0 && (
        <section style={{ marginTop: '24px', padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '6px', border: '1px solid #4CAF50' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>📈 Active Trades ({trackedTrades.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {trackedTrades.map((trade: any) => (
              <div key={trade.id} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: `2px solid ${trade.unrealizedPL >= 0 ? '#4CAF50' : '#f44'}` }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  {trade.symbol} {trade.optionType} ${trade.strikePrice}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  <div>Entry: ${trade.entryPrice?.toFixed(2)}</div>
                  <div>Current: ${trade.currentPrice?.toFixed(2)}</div>
                  <div>Qty: {trade.quantity}</div>
                  <div style={{ fontWeight: 'bold', color: trade.unrealizedPL >= 0 ? '#4CAF50' : '#f44', marginTop: '4px' }}>
                    P/L: ${trade.unrealizedPL?.toFixed(2)} ({trade.unrealizedPLPercent?.toFixed(2)}%)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => {
                      const exitPrice = prompt(`Exit price for ${trade.symbol}:`, trade.currentPrice)
                      if (exitPrice) closeTrade(trade.id, parseFloat(exitPrice))
                    }}
                    style={{ flex: 1, padding: '6px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#f44', color: 'white', border: 'none', borderRadius: '3px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}


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
}
