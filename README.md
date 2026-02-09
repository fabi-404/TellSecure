# 🛡️ ComplyBox

**The Sovereign Whistleblowing Platform for the DACH Market.**
ComplyBox is a privacy-first B2B SaaS designed to help SMBs comply with the German Whistleblower Protection Act (HinSchG) without compromising data sovereignty.

![Status](https://img.shields.io/badge/Status-Prototype-emerald) ![Stack](https://img.shields.io/badge/Stack-Sovereign-blue)

## 🚀 The Concept: "Sovereign Tech"

Most compliance tools rely on US-based cloud providers (AWS/Azure) or external AI APIs (OpenAI). ComplyBox takes a different approach: **Total Data Sovereignty.**

* **Hosting:** Self-hosted on Hetzner Cloud (Nuremberg/Falkenstein).
* **AI:** Local LLM inference (Llama 3 via Ollama) for risk analysis and translation. No data ever leaves the server.
* **Storage:** Self-hosted S3 (Garage) for encrypted evidence storage.

## 🛠️ The "Raw" Tech Stack

Built for performance, control, and zero vendor lock-in.

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
* **Database:** [PostgreSQL](https://www.postgresql.org/) managed via [Coolify](https://coolify.io/)
* **ORM:** [Drizzle ORM](https://orm.drizzle.team/) (Type-safe, lightweight)
* **Auth:** [Auth.js v5](https://authjs.dev/) (Self-hosted sessions)
* **Storage:** [Garage](https://garagehq.deuxfleurs.fr/) (S3-compatible object store)
* **AI Engine:** [Ollama](https://ollama.com/) running Llama 3 (8B)
* **Styling:** Tailwind CSS + shadcn/ui

## ⚡ Key Features

1.  **Multi-Tenancy:** Secure data isolation for multiple corporate clients using tenant-based schemas.
2.  **Anonymous Reporting:** End-to-end encrypted communication channel for whistleblowers.
3.  **Local AI Analyst:**
    * Auto-translation of reports (e.g., Polish -> German).
    * Risk classification (Low/Medium/High) without sending data to OpenAI.
4.  **Async Processing:** Cron-based background workers for heavy AI tasks to keep the UI snappy.

## 🏗️ Architecture

```mermaid
graph TD
    User[User / Whistleblower] -->|HTTPS| Traefik[Traefik Proxy]
    Traefik --> Next[Next.js App]
    Next -->|SQL| DB[(Postgres)]
    Next -->|S3 API| Garage[(Garage Storage)]
    Next -->|Internal API| Ollama[Ollama AI]
    
    subgraph Hetzner VPS [Coolify Host]
    Next
    DB
    Garage
    Ollama
    end
