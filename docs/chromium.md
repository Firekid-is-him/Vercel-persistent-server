# Using Chromium on Vercel

Vercel supports running a headless Chromium instance inside serverless functions using the `@sparticuz/chromium` package. This enables scraping, PDF generation, and screenshot functionality without needing a separate server.

---

## Limitations

Vercel has a maximum function bundle size of **50MB**. The `@sparticuz/chromium` package is approximately 40MB compressed, which means it fits but leaves limited room for other dependencies in the same function. Keep this in mind when structuring your project.

Execution time on the free plan is limited to 10 seconds. On Pro, it is 60 seconds. Complex scraping tasks may exceed these limits.

---

## Installation

In your Vercel project, install the required packages:

```bash
npm install @sparticuz/chromium puppeteer-core
```

Do not install the full `puppeteer` package. It bundles its own Chromium, which will exceed the size limit. Use `puppeteer-core` and point it at `@sparticuz/chromium` instead.

---

## Basic Setup

```js
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto("https://example.com");
  const title = await page.title();

  await browser.close();

  return res.json({ title });
}
```

---

## Generating a PDF

```js
await page.goto("https://example.com", { waitUntil: "networkidle0" });
const pdf = await page.pdf({ format: "A4" });
await browser.close();

res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
res.send(pdf);
```

---

## Taking a Screenshot

```js
await page.goto("https://example.com");
const screenshot = await page.screenshot({ type: "png" });
await browser.close();

res.setHeader("Content-Type", "image/png");
res.send(screenshot);
```

---

## Vercel Configuration

Add the following to your `vercel.json` to increase the memory allocation for functions using Chromium:

```json
{
  "functions": {
    "api/screenshot.js": {
      "memory": 1024
    }
  }
}
```

The default memory allocation (1024MB) is usually sufficient. Chromium can be memory-intensive, so avoid running multiple concurrent instances if possible.

---

## Notes

- Always call `browser.close()` at the end of every function execution. Failing to do so may cause memory leaks and unpredictable behavior.
- Chromium on Vercel is stateless. Every function invocation starts a fresh browser instance.
- If you need persistent sessions or cookies across requests, store them externally in a database or Redis and restore them on each invocation.
- For heavy scraping workloads, a dedicated server is a more reliable option than a Vercel serverless function.
