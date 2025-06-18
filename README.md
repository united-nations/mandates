# UN80 Dashboard

This is a Next.js application that serves as a dashboard to explore and filter United Nations mandates.

## ✨ Features

- **Search**: Find mandates by keyword, symbol, or entity.
- **Filter**: Narrow down results by Priority Area or by the issuing Entity.
- **Active Filters**: A clear view of all active filters.

## 🚀 Tech Stack

- [Next.js](https://nextjs.org/) - React Framework
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Shadcn/ui](https://ui.shadcn.com/) - Re-usable components built using Radix UI and Tailwind CSS.

## 🏁 Getting Started

### Prerequisites

Make sure you have Node.js (v20 or higher) and npm installed on your machine.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd un80-dashboard
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

To start the development server, run the following command:

```bash
npm run dev
```

This will start the application on `http://localhost:9002`.

## ⚙️ Available Scripts

- `npm run dev`: Starts the development server with Turbopack.
- `npm run build`: Creates a production build of the application.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase using Next.js's built-in ESLint configuration.
- `npm run typecheck`: Runs the TypeScript compiler to check for type errors.
- `npm run genkit:dev`: Starts the Genkit development server.
- `npm run genkit:watch`: Starts the Genkit development server in watch mode.

## Config for page outside the iframe

```html
<iframe
  id="analytics"
  src="https://un80analytics.azurewebsites.net"
  style="width:100%; border:none; overflow:hidden;"
  sandbox="allow-downloads allow-forms allow-popups allow-scripts allow-same-origin"
  scrolling="no">
</iframe>

<script>
(() => {
  const FRAME_ID = 'analytics';
  const FRAME_ORG = 'https://un80analytics.azurewebsites.net';
  const frame = document.getElementById(FRAME_ID);

  function sendPositionContext() {
    if (!frame.contentWindow) return;
    const iframeRect = frame.getBoundingClientRect();
    const context = {
      type: 'parentContext',
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      iframeTop: iframeRect.top + window.scrollY,
    };
    frame.contentWindow.postMessage(context, FRAME_ORG);
  }

  if (location.search && !frame.src.includes('?')) {
    frame.src += location.search;
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== FRAME_ORG) return;
    const { type, height, params } = e.data || {};
    if (type === 'setHeight' && Number.isFinite(height)) frame.style.height = `${height}px`;
    if (type === 'syncParams' && typeof params === 'string' && params !== location.search) {
      history.replaceState(null, '', `${location.pathname}${params}${location.hash}`);
    }
    if (type === 'requestParentContext') sendPositionContext();
  });

  frame.addEventListener('load', () => {
    frame.contentWindow?.postMessage({ type: 'init', params: location.search }, FRAME_ORG);
    sendPositionContext();
  });

  window.addEventListener('resize', () => {
    frame.contentWindow?.postMessage({ type: 'pingHeight' }, FRAME_ORG);
    sendPositionContext();
  }, { passive: true });

  window.addEventListener('scroll', sendPositionContext, { passive: true });
})();
</script>
```