# Axiom Pro | API Workbench

**Axiom Pro** is a high-performance, browser-based API engineering environment designed for rapid prototyping, schema architecting, and health monitoring.

🚀 **Live App:** [https://axiom-api.pages.dev/](https://axiom-api.pages.dev/)

---

## ✨ Key Features

- **Mass Transmit Engine**: A professional bulk-transmission hub for stress-testing endpoints with "Linear" or "Chaotic" sequence generation.
- **Schema Architect**: A visual JSON builder that allows you to construct complex payloads without manual syntax errors.
- **Real-time Monitoring**: Integrated telemetry dashboard with SVG latency tracking, uptime calculation, and automated background health checks.
- **PWA & Offline Ready**: Full service-worker support allows for engineering work even without an active internet connection.
- **Variable Injection**: Global environment variables supported across URLs, Headers, and JSON Payloads using the `{{key}}` syntax.
- **Adaptive UI**: The entire interface dynamically shifts its accent color based on the HTTP Protocol Verb (GET = Emerald, POST = Blue/Purple, PUT = Amber, etc.).
- **cURL Transmuter**: Instantly convert standard cURL commands into workbench requests.

---

## 🛠 Tech Stack

- **Framework**: React 19 (ESM)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **PWA**: Custom Service Worker implementation
- **Language**: TypeScript

---

## 🚀 Getting Started

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local engine:
   ```bash
   npm run dev
   ```

### Localhost API Testing

To communicate with local APIs (e.g., C# / .NET) from the hosted environment, you must enable "Insecure Content" for the site to allow `HTTPS -> HTTP` local traffic:

1. Click the **Lock Icon** 🔒 in your browser's address bar.
2. Select **Site Settings**.
3. Set **Insecure Content** to **Allow**.
4. Use the **Guide** tab in the app for troubleshooting CORS and connection issues.

---

## 📄 License

MIT © [Axiom API Engineering]