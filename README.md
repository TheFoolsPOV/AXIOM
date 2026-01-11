# Axiom Pro | Universal API Workbench

**Axiom Pro** is a professional-grade API engineering and development environment built for high-velocity testing, schema architecting, and health monitoring. It bridges the gap between simple request tools and full-scale automated testing suites.

🚀 **Live Preview:** [https://axiom-api.pages.dev/](https://axiom-api.pages.dev/)

---

## ✨ Core Capabilities

### ⚡ Mass Transmit Engine
A high-performance bulk-transmission hub designed for stress-testing endpoints.
- **Linear Mode**: Sequence-based testing using incremental counters.
- **Chaotic Mode**: Randomized fuzz-testing to discover edge-case failures.
- **Strategies**: Choose between "Sequential" (safe) and "Burst" (parallel) transmission.

### 🏗️ Schema Architect
Stop fighting JSON syntax errors. Use a visual builder to construct complex nested objects.
- **Hydration**: Instantly convert any API response back into a visual architect template.
- **Strict Typing**: Manage strings, numbers, booleans, and nulls with protocol-aware validation.

### 📈 Background Health Monitoring
A persistent telemetry dashboard that stays active while you work.
- **SVG Latency Graphs**: Real-time visualization of endpoint performance.
- **Live Telemetry**: Automated pings that continue running in the background.
- **Stats Wipe**: Intelligent state management that resets metrics when shifting targets.

### 🔐 Environment Management
Manage variables across different deployment stages (Dev, Staging, Prod).
- **Injection Engine**: Use `{{variable}}` syntax in URLs, headers, and payloads.
- **Workspace Portability**: Export and import your entire workbench state as a JSON backup.

---

## 🎨 Visual Philosophy

- **Protocol-Aware UI**: The interface dynamically shifts its primary accent color based on the HTTP Verb (GET = Emerald, POST = Blue, DELETE = Rose).
- **Glassmorphism**: A deep, focused dark-mode aesthetic designed for long engineering sessions.
- **Zero-Latency Interactions**: Optimized React components ensure the UI stays responsive even during high-volume data streams.

---

## 🚀 Local Development Testing

To test local services (localhost) from the hosted Axiom Pro environment:

1. Click the **Lock/Info Icon** 🔒 in your browser's address bar.
2. Navigate to **Site Settings**.
3. Set **Insecure Content** to **Allow** (this enables browser-to-localhost communication).
4. Ensure your local server has **CORS** enabled for `*` or the Axiom domain.

---

## 🛠 Tech Specs

- **Core**: React 19 + TypeScript
- **Styling**: Tailwind CSS (JIT)
- **Persistence**: Enhanced LocalStorage Hydration
- **Architecture**: ESM-native with PWA Offline Support

---

📄 **License**: MIT © Axiom Engineering Team