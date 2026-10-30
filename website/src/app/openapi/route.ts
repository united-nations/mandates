// A standalone Swagger UI document, matching the transcripts app's reference.
// Keep it outside React so the third-party renderer owns its DOM.
export async function GET() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Reference — UN Mandate Registry</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.34.1/swagger-ui.css" />
  <style>body { margin: 0; } nav { padding: 1rem 20px; font: 14px sans-serif; } nav a { color: #0077a8; }</style>
</head>
<body>
  <nav aria-label="Back to website"><a href="/about">About the Mandate Registry</a></nav>
  <div id="swagger-ui"></div>
  <noscript>Enable JavaScript to use the interactive reference, or <a href="/openapi.json">read the OpenAPI specification (JSON)</a>.</noscript>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.34.1/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/openapi.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      validatorUrl: null,
    });
  </script>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
