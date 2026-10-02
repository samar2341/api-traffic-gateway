# API Traffic Gateway

A controlled API traffic lab built as exactly two web applications. Web 1 creates requests and traffic; Web 2 receives them through a gateway, makes security decisions in a native C engine, hosts the protected API, and provides monitoring.

## Architecture

```text
apps/sender                 Web 1: React + Vite request sender
apps/gateway/client         Web 2: React + Vite monitoring console
apps/gateway/server         Web 2: Express + Socket.IO + Prisma
engine                      Native C DSA library and request processor
```

The C engine is a separate native module, not a third web application. Required Queue, Stack, List, Linked List, and Tree structures are implemented in C and used by the request decision path. Node communicates with one persistent native process using a line-oriented stdin/stdout protocol.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- GCC-compatible C compiler approved by the operating system's application-control policy
- PostgreSQL 15+

## Install

```powershell
npm.cmd --prefix apps/sender install
npm.cmd --prefix apps/gateway/client install
npm.cmd --prefix apps/gateway/server install
```

Create a server environment file by copying `apps/gateway/server/.env.example` to `apps/gateway/server/.env`. Set a strong `JWT_SECRET`, demo credentials, and `DATABASE_URL` for PostgreSQL. Create the `api_traffic_gateway` database, then from the repository root run:

```powershell
npm.cmd --prefix apps/gateway/server run db:generate
npm.cmd --prefix apps/gateway/server run db:push
npm.cmd --prefix apps/gateway/server run build:engine
```

If `DATABASE_URL` is omitted, the server clearly reports that it uses in-memory development storage; this mode is not persistent. The development token defaults (`demo` / `gateway-demo`, `viewer` / `gateway-viewer`) are for local demonstrations only and are disabled in production unless explicit credentials are configured.

## Run

Open separate terminals from the repository root:

```powershell
npm.cmd --prefix apps/sender run dev
npm.cmd --prefix apps/gateway/client run dev
npm.cmd --prefix apps/gateway/server run dev
```

- Sender: http://localhost:5173
- Gateway console: http://localhost:5174
- Gateway API: http://localhost:3000

The gateway server requires the compiled C engine. It fails startup explicitly if the executable is missing rather than substituting JavaScript decision logic. Sign into the gateway console and use **Copy token** to authorize the sender's requests.

## Features

- Request builder: GET, POST, PUT, PATCH, DELETE; endpoint, headers, query, JSON body; response status/body/time.
- Traffic generator: request count, rate, concurrency, pause/stop, and normal, invalid, unauthorized, SQL injection, and flood scenarios. The sender constructs traffic; it does not decide whether traffic is malicious.
- Gateway: C-based route validation, token state evaluation, per-source rate and burst limiting, configurable SQL pattern matching, and deterministic ALLOW/BLOCK/RATE_LIMIT decisions before protected handlers.
- Monitoring: dashboard metrics, request history, filtered security events, rules management, and Socket.IO updates.
- Persistence: PostgreSQL models for gateway requests, security events, rules, and blocked sources via Prisma.
- Security controls: JWT authentication, admin authorization, Helmet headers, origin-limited CORS, bounded JSON bodies, input validation, and structured server errors.

## API

- `GET /api/health`
- `POST /api/auth/token`
- `GET|POST /api/test`
- `GET|POST|PUT|PATCH|DELETE /api/protected`
- `GET /api/metrics`
- `GET /api/requests`
- `GET /api/security/events`
- `GET /api/rules`
- Admin: `POST /api/admin/rules`, `PATCH|DELETE /api/admin/rules/:id`, `GET|POST /api/admin/blocked-sources`
- `GET /api/dsa`

Socket.IO events: `gateway:connected`, `request:processed`, `security:event`, `gateway:stats`, and `rules:changed`. A valid bearer token is required to connect.

## Tests

```powershell
npm.cmd --prefix apps/sender run build
npm.cmd --prefix apps/gateway/client run build
npm.cmd --prefix apps/gateway/server run test
npm.cmd --prefix apps/gateway/server run test:engine
```

`test:engine` compiles and runs C assertions covering the five required data structures. The same OS-approved C compiler is required for both the engine and its tests.

## Limits

This is an academic gateway demonstration, not a production WAF or distributed traffic service. Rate counters and native DSA state are process-local; horizontal deployments require shared state and coordination. High-volume tests should remain controlled and use modest request counts on local machines. PostgreSQL persistence requires a configured, reachable database.

## Project Documents

- [Product Requirements Document](PRD/prd.md)
- [Coding Phases](PRD/code.md)
