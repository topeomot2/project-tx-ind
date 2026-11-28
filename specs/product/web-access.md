---
id: ACCESS
status: draft
contracts: [ApiError]
---

# Calling the api from a web app on another origin

## Why

The web app and the api may be deployed to different origins, such as
`https://app.example.com` and `https://api.example.com`. A browser lets a
page on one origin call another only when that origin allows it (CORS).
The api allows the web app origins it is told about, and no others.

## Requirements

The api reads the allowed origins from `WEB_ORIGINS`, a comma-separated
list such as `http://localhost:5173,https://app.example.com`. The E2E
tests run the web app on `http://localhost:5173` and the api on
`http://localhost:3000`, so every web test also checks this spec.

### ACCESS-1: An allowed origin may call the api

- **Given** `WEB_ORIGINS` holds `http://localhost:5173`
- **When** a caller sends a preflight `OPTIONS /sessions` with
  `Origin: http://localhost:5173`,
  `Access-Control-Request-Method: POST` and
  `Access-Control-Request-Headers: content-type, authorization`
- **Then** it gets a `2xx` status with
  `Access-Control-Allow-Origin: http://localhost:5173`, an
  `Access-Control-Allow-Methods` that holds `POST`, and an
  `Access-Control-Allow-Headers` that holds `content-type` and
  `authorization`

### ACCESS-2: Answers to an allowed origin say so

- **Given** `WEB_ORIGINS` holds `http://localhost:5173`
- **When** a caller sends `GET /health` with
  `Origin: http://localhost:5173`
- **Then** the answer has
  `Access-Control-Allow-Origin: http://localhost:5173`

### ACCESS-3: Other origins are not allowed

- **Given** `WEB_ORIGINS` does not hold `https://evil.example`
- **When** a caller sends the ACCESS-1 preflight and `GET /health` with
  `Origin: https://evil.example`
- **Then** neither answer has an `Access-Control-Allow-Origin` header

## Out of scope

- Cookies and `Access-Control-Allow-Credentials`: the token is a bearer
  token in the `Authorization` header, never a cookie.
- Wildcard origins (`*`) and origin patterns.

## Safeguards

- None.

## Open questions

Answered by Temitope, 2026-11-28:

- Bearer tokens in the `Authorization` header, not cookies, so the web app
  and the api can be deployed to different base URLs or subdomains.
