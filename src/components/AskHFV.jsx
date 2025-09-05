import React, { useState } from "react";
export default function AskHFV(){
  const [q,setQ] = useState(""); const [a,setA]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(){
    setBusy(true); setA("");
    const r = await fetch("/api/ask",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({q})});
    const j = await r.json(); setBusy(false); setA(j.answer || "No answer");
  }
  return (
    <section className="card" style={{maxWidth:640}}>
      <h3 style={{marginTop:0}}>Ask HFV Agent</h3>
      <textarea rows={3} value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g., best staking today?"/>
      <div style={{marginTop:8}}>
        <button className="btn" onClick={submit} disabled={busy || !q.trim()}>Ask</button>
      </div>
      {a && <pre style={{whiteSpace:"pre-wrap",marginTop:8}}>{a}</pre>}
    </section>
  );
}
