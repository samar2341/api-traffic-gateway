import { useEffect, useRef, useState } from "react";

const API_DEFAULT = "http://localhost:3000";
const presets = ["Normal", "Invalid", "Unauthorized", "SQL Injection", "Flood Simulation"];
const simulatedSourceOptions = ["192.0.2.10", "192.0.2.11", "198.51.100.45"];

export default function App() {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem("gatewayApi") || API_DEFAULT);
  const [token, setToken] = useState(localStorage.getItem("gatewayToken") || "");
  const [simulatedSource, setSimulatedSource] = useState("192.0.2.10");
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState("/api/test");
  const [headersText, setHeadersText] = useState("{}");
  const [queryText, setQueryText] = useState("{}");
  const [bodyText, setBodyText] = useState("{}");
  const [mode, setMode] = useState("Normal");
  const [response, setResponse] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(25);
  const [rpm, setRpm] = useState(600);
  const [concurrency, setConcurrency] = useState(4);
  const [metrics, setMetrics] = useState({ sent: 0, success: 0, failed: 0 });
  const stopRef = useRef(false);
  const pauseRef = useRef(false);
  const controllersRef = useRef(new Set());

  useEffect(() => {
    localStorage.setItem("gatewayApi", apiUrl);
  }, [apiUrl]);

  useEffect(() => {
    localStorage.setItem("gatewayToken", token);
  }, [token]);

  useEffect(() => () => {
    stopRef.current = true;
    for (const controller of controllersRef.current) controller.abort();
  }, []);

  function scenario() {
    const selectedEndpoint = mode === "Invalid" ? "/api/not-a-route" : endpoint;
    let body = {};
    try { body = JSON.parse(bodyText || "{}"); }
    catch { throw new Error("Request body must be valid JSON."); }
    if (mode === "SQL Injection") body = { ...body, search: "' OR '1'='1" };
    return {
      endpoint: selectedEndpoint,
      method: method === "GET" && ["SQL Injection"].includes(mode) ? "POST" : method,
      headers: JSON.parse(headersText || "{}"),
      query: JSON.parse(queryText || "{}"),
      body,
      includeToken: mode !== "Unauthorized" && Boolean(token),
    };
  }

  async function dispatch(options = {}) {
    const test = options.scenario || scenario();
    const url = new URL(`${apiUrl.replace(/\/$/, "")}${test.endpoint}`);
    for (const [key, value] of Object.entries(test.query)) url.searchParams.set(key, String(value));
    const headers = new Headers(test.headers);
    if (simulatedSource?.trim()) headers.set("X-Gateway-Simulated-Source", simulatedSource.trim());
    if (test.method !== "GET" && test.method !== "DELETE") headers.set("Content-Type", "application/json");
    if (test.includeToken && token) headers.set("Authorization", `Bearer ${token}`);
    const controller = new AbortController();
    controllersRef.current.add(controller);
    const startedAt = performance.now();
    try {
      const result = await fetch(url, {
        method: test.method,
        headers,
        body: ["GET", "DELETE"].includes(test.method) ? undefined : JSON.stringify(test.body),
        signal: controller.signal,
      });
      const text = await result.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      const item = { status: result.status, duration: Number((performance.now() - startedAt).toFixed(1)), data, time: new Date().toLocaleTimeString() };
      setResponse(item);
      setMetrics((previous) => ({ sent: previous.sent + 1, success: previous.success + (result.ok ? 1 : 0), failed: previous.failed + (result.ok ? 0 : 1) }));
      return item;
    } catch (error) {
      if (error.name !== "AbortError") {
        const item = { status: "ERR", duration: Number((performance.now() - startedAt).toFixed(1)), data: { error: error.message }, time: new Date().toLocaleTimeString() };
        setResponse(item);
        setMetrics((previous) => ({ ...previous, sent: previous.sent + 1, failed: previous.failed + 1 }));
      }
      return null;
    } finally {
      controllersRef.current.delete(controller);
    }
  }

  async function sendOne(event) {
    event.preventDefault();
    try { await dispatch(); }
    catch (error) { setResponse({ status: "ERR", duration: 0, data: { error: error.message }, time: new Date().toLocaleTimeString() }); }
  }

  async function runTraffic() {
    let test;
    try { test = scenario(); }
    catch (error) { setResponse({ status: "ERR", duration: 0, data: { error: error.message }, time: new Date().toLocaleTimeString() }); return; }
    stopRef.current = false;
    pauseRef.current = false;
    setPaused(false);
    setBusy(true);
    const total = Math.min(Math.max(Number(count) || 1, 1), 5000);
    const workers = Math.min(Math.max(Number(concurrency) || 1, 1), 20, total);
    const interval = 60000 / Math.min(Math.max(Number(rpm) || 1, 1), 50000);
    let next = 0;
    let nextDispatch = performance.now();
    const worker = async () => {
      while (next < total && !stopRef.current) {
        while (pauseRef.current && !stopRef.current) await new Promise((resolve) => setTimeout(resolve, 100));
        if (stopRef.current) break;
        const index = next++;
        const delay = Math.max(0, nextDispatch - performance.now());
        nextDispatch = Math.max(nextDispatch, performance.now()) + interval;
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (!stopRef.current) await dispatch({ scenario: test, index });
      }
    };
    await Promise.all(Array.from({ length: workers }, worker));
    setBusy(false);
    setPaused(false);
  }

  function stopTraffic() {
    stopRef.current = true;
    pauseRef.current = false;
    setPaused(false);
  }

  function togglePause() {
    pauseRef.current = !pauseRef.current;
    setPaused(pauseRef.current);
  }

  function selectPreset(value) {
    setMode(value);
    if (value === "Invalid") setEndpoint("/api/not-a-route");
    else if (value !== "Invalid") setEndpoint("/api/test");
    if (value === "SQL Injection") setMethod("POST");
    if (value === "Flood Simulation") { setCount(1000); setRpm(50000); setConcurrency(20); }
  }

  const responseSuccess = response?.status >= 200 && response?.status < 300;

  return (
    <div className="sender-shell">
      <header className="sender-topbar">
        <a className="brand" href="#top"><span className="brand-mark">AT</span><span>Traffic Lab<small>REQUEST SENDER</small></span></a>
        <div className="topbar-status"><span className="status-dot" /> GATEWAY TARGET <strong>{apiUrl}</strong></div>
      </header>
      <main id="top" className="sender-layout">
        <section className="sender-heading">
          <div><p className="eyebrow">WEB 1 / TRAFFIC SOURCE</p><h1>Request Workshop</h1><p>Configure a request or run a controlled scenario against the gateway.</p></div>
          <div className="session-pill"><span className={token ? "status-dot" : "status-dot muted"} /> {token ? "Bearer token loaded" : "Unauthenticated"}</div>
        </section>

        <section className="sender-workspace">
          <form className="request-form" onSubmit={sendOne}>
            <div className="panel-heading"><div><span className="panel-index">01</span><h2>Request builder</h2></div><span className="panel-caption">SINGLE REQUEST</span></div>
            <label className="field-label">Gateway URL<input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} spellCheck="false" /></label>
            <label className="field-label">Bearer token<input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste a token from the gateway dashboard" spellCheck="false" /></label>
            <label className="field-label">Simulated source IP<input list="simulatedSources" value={simulatedSource} onChange={(event) => setSimulatedSource(event.target.value)} spellCheck="false" /><datalist id="simulatedSources">{simulatedSourceOptions.map((item) => <option key={item} value={item} />)}</datalist></label>
            <div className="request-line">
              <label className="field-label method-field">Method<select value={method} onChange={(event) => setMethod(event.target.value)}>{["GET", "POST", "PUT", "PATCH", "DELETE"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field-label endpoint-field">Endpoint<input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} required spellCheck="false" /></label>
            </div>
            <div className="editor-grid">
              <label className="field-label">Headers <span>JSON</span><textarea rows="4" value={headersText} onChange={(event) => setHeadersText(event.target.value)} spellCheck="false" /></label>
              <label className="field-label">Query parameters <span>JSON</span><textarea rows="4" value={queryText} onChange={(event) => setQueryText(event.target.value)} spellCheck="false" /></label>
            </div>
            <label className="field-label">Request body <span>JSON</span><textarea className="body-editor" rows="6" value={bodyText} onChange={(event) => setBodyText(event.target.value)} spellCheck="false" /></label>
            <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}><span>↗</span> Send request</button><span className="microcopy">Decision logic runs on Web 2</span></div>
          </form>

          <aside className="sender-side">
            <section className="scenario-panel">
              <div className="panel-heading"><div><span className="panel-index">02</span><h2>Test scenario</h2></div></div>
              <label className="field-label">Scenario<select value={mode} onChange={(event) => selectPreset(event.target.value)}>{presets.map((item) => <option key={item}>{item}</option>)}</select></label>
              <div className="scenario-note"><span className="note-mark">i</span><p>The sender sets request content only. The gateway makes every security decision.</p></div>
              <div className="traffic-controls">
                <label className="field-label">Request count<input type="number" min="1" max="5000" value={count} onChange={(event) => setCount(event.target.value)} /></label>
                <label className="field-label">Target rate <span>req/min</span><input type="number" min="1" max="50000" value={rpm} onChange={(event) => setRpm(event.target.value)} /></label>
                <label className="field-label">Concurrency<input type="number" min="1" max="20" value={concurrency} onChange={(event) => setConcurrency(event.target.value)} /></label>
              </div>
              <div className="generator-actions">
                {!busy ? <button type="button" className="primary-button" onClick={runTraffic}><span>▶</span> Start generator</button> : <><button type="button" className="secondary-button" onClick={togglePause}>{paused ? "Resume" : "Pause"}</button><button type="button" className="stop-button" onClick={stopTraffic}>Stop</button></>}
                <span className={busy ? "running-label" : "idle-label"}><i /> {busy ? paused ? "Paused" : "Running" : "Ready"}</span>
              </div>
            </section>

            <section className="metrics-panel">
              <div className="panel-heading"><div><span className="panel-index">03</span><h2>Sender metrics</h2></div><button className="reset-button" type="button" onClick={() => setMetrics({ sent: 0, success: 0, failed: 0 })}>Reset</button></div>
              <div className="metric-strip"><div><strong>{metrics.sent.toLocaleString()}</strong><span>Sent</span></div><div><strong>{metrics.success.toLocaleString()}</strong><span>2xx</span></div><div><strong>{metrics.failed.toLocaleString()}</strong><span>Failed</span></div></div>
              <div className="response-panel">
                <div className="response-title"><span>Latest response</span>{response && <span className={responseSuccess ? "response-code success" : "response-code failure"}>{response.status}</span>}</div>
                {response ? <><div className="response-meta"><span>{response.duration} ms</span><span>{response.time}</span></div><pre>{JSON.stringify(response.data, null, 2)}</pre></> : <div className="empty-response">Waiting for a request</div>}
              </div>
            </section>
          </aside>
        </section>
        <footer className="sender-footer"><span>API TRAFFIC GATEWAY</span><span>WEB 1 · REQUEST GENERATION ONLY</span></footer>
      </main>
    </div>
  );
}