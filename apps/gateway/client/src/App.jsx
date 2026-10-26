import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API = import.meta.env.VITE_GATEWAY_API || "http://localhost:3000";
const tabs = [
  ["/", "Overview", "01"],
  ["/requests", "Requests", "02"],
  ["/events", "Security events", "03"],
  ["/rules", "Rules", "04"],
  ["/dsa", "DSA monitor", "05"],
];

async function api(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/api/auth/token", null, { method: "POST", body: JSON.stringify({ username, password }) });
      localStorage.setItem("gatewayDashboardToken", data.token);
      onLogin(data.token);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }

  return <main className="login-screen"><section className="login-aside"><p className="brand-kicker">API TRAFFIC GATEWAY</p><div className="login-grid-art" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><p className="login-rail">CONTROL PLANE <i /> LIVE MONITORING</p></section><form className="login-form" onSubmit={submit}><p className="eyebrow">WEB 2 / OPERATOR ACCESS</p><h1>Gateway console</h1><p className="login-copy">Sign in to inspect traffic, events, and gateway rules.</p><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="form-error">{error}</p>}<button className="button-primary" disabled={loading}>{loading ? "Signing in..." : "Sign in"}<span>↗</span></button><p className="login-hint">Configure DEMO_USERNAME and DEMO_PASSWORD in the server environment.</p></form></main>;
}

function Metric({ label, value, unit, tone = "" }) {
  return <article className={`metric ${tone}`}><span>{label}</span><strong>{value ?? 0}</strong>{unit && <small>{unit}</small>}</article>;
}

function Decision({ value }) {
  const className = value === "ALLOW" ? "allow" : value === "RATE_LIMIT" ? "limited" : "blocked";
  return <span className={`decision ${className}`}><i />{value || "UNKNOWN"}</span>;
}

function DataTable({ columns, rows, empty = "No records yet" }) {
  if (!rows.length) return <div className="table-empty">{empty}</div>;
  return <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || `${row.timestamp}-${index}`}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? "—"}</td>)}</tr>)}</tbody></table></div>;
}

function Dashboard({ metrics, requests, trend }) {
  const cards = [
    ["Total requests", metrics.totalRequests, "all time", ""],
    ["Allowed", metrics.allowedRequests, "processed", "mint"],
    ["Blocked", metrics.blockedRequests, "rejected", "coral"],
    ["Rate limited", metrics.rateLimitedRequests, "429", "amber"],
    ["Invalid", metrics.invalidRequests, "requests", ""],
    ["Requests / sec", metrics.requestsPerSecond, "current", ""],
    ["Requests / min", metrics.requestsPerMinute, "current", ""],
    ["Peak / min", metrics.peakRequestsPerMinute, "rolling hour", "amber"],
    ["Average latency", metrics.averageLatencyMs, "milliseconds", ""],
    ["Queue length", metrics.engine?.queueLength, "native C queue", ""],
    ["Active requests", metrics.activeRequests, "in process", ""],
  ];
  const requestColumns = [
    { key: "timestamp", label: "Time", render: (row) => new Date(row.timestamp).toLocaleTimeString() },
    { key: "source", label: "Source" },
    { key: "method", label: "Method" },
    { key: "endpoint", label: "Endpoint" },
    { key: "decision", label: "Decision", render: (row) => <Decision value={row.decision} /> },
    { key: "responseCode", label: "Code" },
    { key: "latencyMs", label: "Latency", render: (row) => `${row.latencyMs} ms` },
  ];

  return <div className="page-content"><div className="page-title"><div><p className="eyebrow">LIVE OPERATIONS</p><h1>Gateway overview</h1><p>Traffic decisions and system pressure, as they happen.</p></div><span className="live-tag"><i /> LIVE</span></div><section className="metrics-grid">{cards.map(([label, value, unit, tone]) => <Metric key={label} label={label} value={value} unit={unit} tone={tone} />)}</section><section className="dashboard-grid"><article className="panel traffic-chart"><div className="panel-head"><div><h2>Request volume</h2><p>Recent gateway decisions</p></div><span className="chart-legend"><i /> Requests</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#79c99b" stopOpacity={0.31} /><stop offset="100%" stopColor="#79c99b" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#303a3b" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="time" stroke="#8e9b97" tickLine={false} axisLine={false} minTickGap={30} /><YAxis stroke="#8e9b97" tickLine={false} axisLine={false} width={35} allowDecimals={false} /><Tooltip contentStyle={{ background: "#1b2223", border: "1px solid #394344", borderRadius: 2 }} /><Area type="monotone" dataKey="count" stroke="#a1e1c2" strokeWidth={2} fill="url(#trafficFill)" /></AreaChart></ResponsiveContainer></div></article><article className="panel threat-panel"><div className="panel-head"><div><h2>Threat signals</h2><p>Recorded by gateway analysis</p></div></div><div className="threat-line"><span>SQL injection</span><strong>{metrics.sqlInjectionEvents || 0}</strong></div><div className="threat-line"><span>Traffic flood</span><strong>{metrics.trafficFloodEvents || 0}</strong></div><div className="threat-line"><span>Unauthorized</span><strong>{metrics.unauthorizedEvents || 0}</strong></div><div className="threat-line"><span>Invalid requests</span><strong>{metrics.invalidRequests || 0}</strong></div><div className="gateway-state"><span className="state-light" /><div><strong>Gateway online</strong><small>Node API · Native C engine</small></div><span className="state-storage">{metrics.storage || "memory"}</span></div></article></section><section className="panel table-panel"><div className="panel-head"><div><h2>Recent requests</h2><p>Latest 100 gateway records</p></div><NavLink className="text-link" to="/requests">All requests <span>→</span></NavLink></div><DataTable columns={requestColumns} rows={requests.slice(0, 8)} /></section></div>;
}

function RequestsPage({ requests }) {
  const [search, setSearch] = useState("");
  const filtered = requests.filter((item) => `${item.source} ${item.method} ${item.endpoint} ${item.decision}`.toLowerCase().includes(search.toLowerCase()));
  const columns = [
    { key: "timestamp", label: "Time", render: (row) => new Date(row.timestamp).toLocaleString() },
    { key: "source", label: "Source" }, { key: "method", label: "Method" }, { key: "endpoint", label: "Endpoint" },
    { key: "decision", label: "Decision", render: (row) => <Decision value={row.decision} /> },
    { key: "responseCode", label: "Response" }, { key: "latencyMs", label: "Latency", render: (row) => `${row.latencyMs} ms` },
  ];
  return <div className="page-content"><PageTitle eyebrow="TRAFFIC LOG" title="Requests" detail="Gateway decisions, responses, and processing latency." /><section className="panel table-panel"><div className="toolbar"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter source, path, decision" /></label><span className="result-count">{filtered.length} records</span></div><DataTable columns={columns} rows={filtered} /></section></div>;
}

function EventsPage({ refreshKey }) {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ eventType: "", action: "", severity: "", source: "" });
  const [error, setError] = useState("");
  const token = localStorage.getItem("gatewayDashboardToken");
  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api(`/api/security/events?${params}`, token).then((data) => { setEvents(data.events); setError(""); }).catch((cause) => setError(cause.message));
  }, [refreshKey, filters, token]);
  const setFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));
  const columns = [
    { key: "timestamp", label: "Time", render: (row) => new Date(row.timestamp).toLocaleString() },
    { key: "eventType", label: "Event" }, { key: "source", label: "Source" }, { key: "endpoint", label: "Endpoint" },
    { key: "action", label: "Action", render: (row) => <Decision value={row.action} /> },
    { key: "severity", label: "Severity", render: (row) => <span className={`severity ${row.severity}`}>{row.severity}</span> }, { key: "details", label: "Details" },
  ];
  return <div className="page-content"><PageTitle eyebrow="THREAT MONITOR" title="Security events" detail="Requests rejected or limited by gateway policy." />{error && <p className="inline-error">{error}</p>}<section className="panel table-panel"><div className="filter-row"><select value={filters.eventType} onChange={(event) => setFilter("eventType", event.target.value)}><option value="">All event types</option>{["SQL_INJECTION", "FLOOD", "INVALID_REQUEST", "UNAUTHORIZED"].map((item) => <option key={item}>{item}</option>)}</select><select value={filters.action} onChange={(event) => setFilter("action", event.target.value)}><option value="">All actions</option>{["BLOCK", "RATE_LIMIT"].map((item) => <option key={item}>{item}</option>)}</select><select value={filters.severity} onChange={(event) => setFilter("severity", event.target.value)}><option value="">All severity</option>{["low", "medium", "high"].map((item) => <option key={item}>{item}</option>)}</select><input value={filters.source} onChange={(event) => setFilter("source", event.target.value)} placeholder="Source" /></div><DataTable columns={columns} rows={events} empty="No security events match these filters" /></section></div>;
}

function RulesPage({ refreshKey }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ ruleName: "", pattern: "", ruleType: "SQL_INJECTION", action: "BLOCK", enabled: true });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const token = localStorage.getItem("gatewayDashboardToken");

  async function load() {
    try { setRules((await api("/api/rules", token)).rules); setError(""); }
    catch (cause) { setError(cause.message); }
  }
  useEffect(() => { load(); }, [refreshKey]);

  async function createRule(event) {
    event.preventDefault(); setError(""); setNotice("");
    try {
      await api("/api/admin/rules", token, { method: "POST", body: JSON.stringify(form) });
      setForm((previous) => ({ ...previous, ruleName: "", pattern: "" }));
      setNotice("Rule saved and synchronized to the C engine."); await load();
    } catch (cause) { setError(cause.message); }
  }

  async function toggle(rule) {
    try { await api(`/api/admin/rules/${rule.id}`, token, { method: "PATCH", body: JSON.stringify({ enabled: !rule.enabled }) }); await load(); }
    catch (cause) { setError(cause.message); }
  }
  async function remove(rule) {
    try { await api(`/api/admin/rules/${rule.id}`, token, { method: "DELETE" }); await load(); }
    catch (cause) { setError(cause.message); }
  }

  const columns = [
    { key: "ruleName", label: "Rule" }, { key: "ruleType", label: "Type" }, { key: "pattern", label: "Pattern", render: (row) => <code>{row.pattern}</code> },
    { key: "action", label: "Action" }, { key: "enabled", label: "Status", render: (row) => <span className={row.enabled ? "enabled-label" : "disabled-label"}>{row.enabled ? "Enabled" : "Disabled"}</span> },
    { key: "actions", label: "Controls", render: (row) => <span className="row-actions"><button title={row.enabled ? "Disable rule" : "Enable rule"} onClick={() => toggle(row)}>{row.enabled ? "Disable" : "Enable"}</button><button title="Delete rule" onClick={() => remove(row)}>Delete</button></span> },
  ];
  return <div className="page-content"><PageTitle eyebrow="POLICY CONFIGURATION" title="Security rules" detail="C-native SQL patterns govern the protected request pipeline." />{error && <p className="inline-error">{error}</p>}{notice && <p className="inline-notice">{notice}</p>}<section className="panel rule-create"><form onSubmit={createRule}><label>Rule name<input value={form.ruleName} onChange={(event) => setForm({ ...form, ruleName: event.target.value })} required /></label><label>SQL pattern<input value={form.pattern} onChange={(event) => setForm({ ...form, pattern: event.target.value })} maxLength="95" required /></label><button className="button-primary">Add rule <span>+</span></button></form></section><section className="panel table-panel"><div className="panel-head"><div><h2>Active policy set</h2><p>{rules.filter((rule) => rule.enabled).length} enabled rules</p></div></div><DataTable columns={columns} rows={rules} empty="No security rules configured" /></section></div>;
}

function DsaPage({ metrics, refreshKey }) {
  const [dsa, setDsa] = useState({ structures: [], engine: {} });
  const token = localStorage.getItem("gatewayDashboardToken");
  useEffect(() => { api("/api/dsa", token).then(setDsa).catch(() => {}); }, [refreshKey, token]);
  const counts = [
    ["Queue size", dsa.engine.queueLength, "FIFO processing"], ["Front request", dsa.engine.queueLength ? "pending" : "empty", "next to process"],
    ["Enqueued", dsa.engine.totalEnqueued, "total requests"], ["Dequeued", dsa.engine.totalDequeued, "processed items"],
    ["Stack size", dsa.engine.stackSize, "recent security events"], ["Top event", dsa.engine.topEvent || "none", "latest alert"],
    ["History nodes", dsa.engine.historySize, "linked request records"], ["Route list", dsa.engine.routeCount, "configured route entries"],
  ];
  return <div className="page-content"><PageTitle eyebrow="NATIVE ENGINE / C" title="Data structures" detail="Live usage metrics from the C gateway process, not UI-side replicas." /><section className="dsa-metrics">{counts.map(([label, value, note]) => <article className="metric" key={label}><span>{label}</span><strong className="dsa-value">{value ?? 0}</strong><small>{note}</small></article>)}</section><section className="panel dsa-structure-panel"><div className="panel-head"><div><h2>Engine responsibilities</h2><p>Each structure participates in the gateway request path.</p></div><span className="native-stamp">C / NATIVE</span></div><div className="structure-list">{dsa.structures.map((item, index) => <article key={item.name}><span className="structure-number">0{index + 1}</span><div><h3>{item.name}</h3><p>{item.role}</p></div><span className="structure-live">IN USE</span></article>)}</div></section><p className="dsa-footnote">Dashboard aggregates: {metrics.totalRequests || 0} requests observed · C runtime reports bounded in-process queue/history counters.</p></div>;
}

function PageTitle({ eyebrow, title, detail }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{detail}</p></div></div>;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("gatewayDashboardToken") || "demo-token");
  const [metrics, setMetrics] = useState({});
  const [requests, setRequests] = useState([]);
  const [trend, setTrend] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      localStorage.setItem("gatewayDashboardToken", "demo-token");
      setToken("demo-token");
      return undefined;
    }
    let active = true;
    const load = async () => {
      try {
        const [metricData, requestData] = await Promise.all([api("/api/metrics", token), api("/api/requests?limit=100", token)]);
        if (!active) return;
        setMetrics(metricData);
        setRequests(requestData.requests);
        setTrend((previous) => {
          const points = requestData.requests.slice(0, 60).reverse().map((item) => ({ time: new Date(item.timestamp).toLocaleTimeString(), count: 1 }));
          const combined = [...previous, ...points].slice(-60);
          return combined;
        });
        setError("");
      } catch (cause) { if (active) setError(cause.message); }
    };
    load();
    const interval = setInterval(load, 5000);
    const socket = io(API, { auth: { token }, reconnectionAttempts: 3 });
    socket.on("request:processed", (item) => {
      setRequests((previous) => [item, ...previous.filter((request) => request.id !== item.id)].slice(0, 100));
      setTrend((previous) => [...previous, { time: new Date(item.timestamp).toLocaleTimeString(), count: 1 }].slice(-60));
      setRefreshKey((value) => value + 1);
    });
    socket.on("gateway:stats", load);
    socket.on("security:event", () => setRefreshKey((value) => value + 1));
    return () => { active = false; clearInterval(interval); socket.disconnect(); };
  }, [token]);

  function logout() {
    localStorage.removeItem("gatewayDashboardToken");
    setToken(""); setMetrics({}); setRequests([]); setTrend([]); navigate("/");
  }

  if (!token) return <Login onLogin={setToken} />;

  async function copyToken() {
    try { await navigator.clipboard.writeText(token); setError(""); }
    catch { setError("Clipboard access was denied. Copy the token from browser storage."); }
  }

  return <div className="dashboard-shell"><aside className="sidebar"><a className="dashboard-brand" href="/"><span className="brand-mark">AG</span><span>API TRAFFIC<small>GATEWAY CONTROL</small></span></a><div className="sidebar-section">MONITORING</div><nav>{tabs.map(([path, label, number]) => <NavLink end={path === "/"} key={path} to={path} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><span className="nav-number">{number}</span>{label}</NavLink>)}</nav><div className="sidebar-bottom"><div className="connection-card"><span className="status-dot" /><div><strong>Gateway online</strong><small>{metrics.storage === "postgresql" ? "PostgreSQL connected" : "Memory storage"}</small></div></div><button className="logout-button" onClick={logout}>Sign out <span>↗</span></button></div></aside><main className="dashboard-main"><header className="dashboard-topbar"><div className="breadcrumb">GATEWAY <span>/</span> <strong>OPERATIONS</strong></div><div className="topbar-right"><span className="live-tag"><i /> LIVE FEED</span><button className="copy-token" onClick={copyToken} title="Copy bearer token for Web 1">Copy token</button><span className="operator-mark">OP</span></div></header>{error && <div className="global-error">{error}<button onClick={() => setError("")}>Dismiss</button></div>}<Routes><Route path="/" element={<Dashboard metrics={metrics} requests={requests} trend={trend} />} /><Route path="/requests" element={<RequestsPage requests={requests} />} /><Route path="/events" element={<EventsPage refreshKey={refreshKey} />} /><Route path="/rules" element={<RulesPage refreshKey={refreshKey} />} /><Route path="/dsa" element={<DsaPage metrics={metrics} refreshKey={refreshKey} />} /><Route path="*" element={<Dashboard metrics={metrics} requests={requests} trend={trend} />} /></Routes><footer className="dashboard-footer"><span>API TRAFFIC GATEWAY</span><span>DECISION ENGINE · C / NODE.JS</span></footer></main></div>;
}