# Portfolio security and launch checklist

Last reviewed: 2026-11-12

## Completed

- [x] No API keys, GitHub tokens, private keys, `.env` files, or deployment credentials in the public project.
- [x] Contact form submits over HTTPS.
- [x] Removed the unpinned SweetAlert runtime dependency from `index.html`.
- [x] Form success and error feedback now uses the existing in-page message element.
- [x] Added Vercel security headers in `vercel.json`:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restricting camera, microphone, geolocation, and payment access
  - `X-Frame-Options: SAMEORIGIN`
- [x] Local SVG assets contain no scripts, canvas, external image references, or WebGL runtime.
- [x] External links opened in a new tab should use `rel="noopener noreferrer"`.
- [x] Verified the local portfolio still loads after the hardening changes.

## Before production sharing

- [ ] Confirm the GitHub repository is public only if every committed file is safe to publish.
- [ ] Remember that GitHub Pages serves public files but does not apply `vercel.json` response headers. Use the Vercel deployment when these headers are required, or add equivalent headers through a proxy/CDN.
- [ ] Check the deployed site in an incognito window and confirm the exact Vercel domain.
- [ ] Verify `robots.txt`, `sitemap.xml`, and the Google Search Console verification file.
- [ ] Test the contact form with a harmless test message and confirm no private data is exposed in the URL.
- [ ] Test the site on mobile, desktop, keyboard navigation, and with `prefers-reduced-motion`.
- [ ] Check browser DevTools for console errors, failed assets, mixed content, and unexpected third-party requests.
- [ ] Confirm every external link opens the intended destination.
- [ ] Review public images, PDFs, screenshots, and datasets for private email addresses, tokens, internal URLs, or confidential information.
- [ ] Enable GitHub secret scanning and push protection.
- [ ] Keep GitHub and Vercel account 2FA enabled.

## Remaining hardening work

- [ ] Replace the Tailwind CDN runtime with a pinned local production build. The current `cdn.tailwindcss.com` script is still a supply-chain dependency because it executes third-party JavaScript at runtime.
- [ ] Pin or self-host Google Fonts and Font Awesome if the project needs stricter supply-chain control.
- [ ] Add a Content Security Policy only after the inline scripts, inline styles, CDN fonts, Font Awesome, Power BI/Drive embeds, and Google Apps Script form endpoint have been inventoried and tested.
- [ ] Add `rel="noopener noreferrer"` to any remaining `target="_blank"` links that do not already have it.
- [ ] Compress large PNG/JPEG assets to WebP or AVIF without exposing private source material.

## Do not publish

- API keys or provider tokens
- `.env` files
- GitHub personal access tokens
- Vercel tokens
- Database credentials
- Private datasets or internal dashboards
- Raw contact-form submissions
- Screenshots containing passwords, tokens, or private URLs
