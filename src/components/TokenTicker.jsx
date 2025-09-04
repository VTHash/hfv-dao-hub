import React, { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 250; // ← top 250
const GECKO_MARKETS = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${PAGE_SIZE}&page=1&sparkline=false&price_change_percentage=24h`;
const simplePriceUrl = (ids) =>
  `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,btc,eth`;

const fmt = {
  usd: (n) => (n >= 1 ? `$${n.toLocaleString(undefined,{maximumFractionDigits:2})}`
                      : `$${n.toLocaleString(undefined,{maximumFractionDigits:6})}`),
  btc: (n) => `${n.toLocaleString(undefined,{maximumFractionDigits:8})} BTC`,
  eth: (n) => `${n.toLocaleString(undefined,{maximumFractionDigits:6})} ETH`,
  pct: (n) => `${n >= 0 ? "+" : ""}${(n ?? 0).toFixed(2)}%`,
};

export default function TokenTicker() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("mc"); // "mc" | "usd" | "chg"
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true); setErr("");

        // 1) markets (has logo + 24h change + mc)
        const mRes = await fetch(GECKO_MARKETS, { cache: "no-store" });
        if (!mRes.ok) throw new Error("CoinGecko markets error");
        const markets = await mRes.json();

        // 2) multi-quote (usd/btc/eth)
        const ids = markets.map((m) => m.id).join(",");
        const pRes = await fetch(simplePriceUrl(encodeURIComponent(ids)), { cache: "no-store" });
        if (!pRes.ok) throw new Error("CoinGecko price error");
        const prices = await pRes.json();

        // 3) merge
        const merged = markets.map((m) => {
          const p = prices[m.id] || {};
          return {
            id: m.id,
            name: m.name,
            symbol: m.symbol?.toUpperCase(),
            logo: m.image, // ✅ official logo URL
            usdt: typeof p.usd === "number" ? p.usd : m.current_price ?? null,
            btc: typeof p.btc === "number" ? p.btc : null,
            eth: typeof p.eth === "number" ? p.eth : null,
            change24: m.price_change_percentage_24h_in_currency,
            marketCap: m.market_cap,
          };
        });

        if (mounted) setRows(merged);
      } catch (e) {
        if (mounted) setErr(e.message || "Failed to load tokens");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = q
      ? rows.filter(x =>
          x.name.toLowerCase().includes(q) ||
          x.symbol.toLowerCase().includes(q) ||
          x.id.toLowerCase().includes(q))
      : rows;

    if (sortKey === "mc") r = [...r].sort((a,b)=>(b.marketCap??0)-(a.marketCap??0));
    if (sortKey === "usd") r = [...r].sort((a,b)=>(b.usdt??0)-(a.usdt??0));
    if (sortKey === "chg") r = [...r].sort((a,b)=>(b.change24??-Infinity)-(a.change24??-Infinity));
    return r;
  }, [rows, query, sortKey]);

  return (
    <section className="card" aria-labelledby="ticker-title">
      <div style={{display:"flex", alignItems:"center", gap:12, justifyContent:"space-between", flexWrap:"wrap"}}>
        <h2 id="ticker-title" style={{margin:0}}>Markets — Live (Top 250)</h2>
        <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search token (e.g., ETH, ARB)"
            aria-label="Search tokens"
            style={{padding:"10px 12px", borderRadius:12, border:"1px solid rgba(0,255,154,.35)", background:"#0a0f0e", color:"#d6ffe9", minWidth:220}}
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            aria-label="Sort"
            style={{padding:"10px 12px", borderRadius:12, border:"1px solid rgba(0,255,154,.35)", background:"#0a0f0e", color:"#d6ffe9"}}
          >
            <option value="mc">Sort by Market Cap</option>
            <option value="usd">Sort by Price (USDT)</option>
            <option value="chg">Sort by 24h Change</option>
          </select>
        </div>
      </div>

      {loading && <p className="muted" style={{marginTop:12}}>Loading tokens…</p>}
      {err && <p className="muted" style={{marginTop:12}}>Error: {err}</p>}

      {!loading && !err && (
        <div style={{overflowX:"auto", marginTop:12}}>
          <table style={{width:"100%", borderCollapse:"separate", borderSpacing:"0 8px"}}>
            <thead>
              <tr style={{textAlign:"left", fontSize:14, opacity:.9}}>
                <th style={{padding:"6px 8px"}}>#</th>
                <th style={{padding:"6px 8px"}}>Token</th>
                <th style={{padding:"6px 8px"}}>Price (USDT)</th>
                <th style={{padding:"6px 8px"}}>BTC</th>
                <th style={{padding:"6px 8px"}}>ETH</th>
                <th style={{padding:"6px 8px"}}>24h</th>
                <th style={{padding:"6px 8px"}}>MC</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{background:"rgba(0,255,154,.05)", border:"1px solid rgba(0,255,154,.25)", borderRadius:12}}>
                  <td style={{padding:"10px 8px"}}>{i+1}</td>
                  <td style={{padding:"10px 8px", display:"flex", alignItems:"center", gap:10}}>
                    <img
                      src={t.logo}
                      alt={`${t.name} logo`}
                      style={{width:24, height:24, borderRadius:6, background:"#fff", objectFit:"contain", boxShadow:"0 0 8px rgba(0,255,154,.2)", padding:2}}
                      loading="lazy"
                    />
                    <div>
                      <div style={{fontWeight:700}}>{t.name}</div>
                      <div className="muted" style={{fontSize:12}}>{t.symbol}</div>
                    </div>
                  </td>
                  <td style={{padding:"10px 8px"}}>{t.usdt != null ? fmt.usd(t.usdt) : "—"}</td>
                  <td style={{padding:"10px 8px"}}>{t.btc != null ? fmt.btc(t.btc) : "—"}</td>
                  <td style={{padding:"10px 8px"}}>{t.eth != null ? fmt.eth(t.eth) : "—"}</td>
                  <td style={{padding:"10px 8px", color:(t.change24 ?? 0) >= 0 ? "#67ffaf" : "#ff5c7a"}}>
                    {t.change24 != null ? fmt.pct(t.change24) : "—"}
                  </td>
                  <td style={{padding:"10px 8px"}}>{t.marketCap != null ? `$${t.marketCap.toLocaleString()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tiny" style={{opacity:.7, marginTop:10}}>
        Data by CoinGecko • Top 250 • Prices in USDT≈USD, BTC, ETH
      </div>
    </section>
  );
}