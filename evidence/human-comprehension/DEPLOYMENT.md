# HUMAN COMPREHENSION DEPLOYMENT

**Status:** DEPLOYED — PUBLIC PREVIEW
**Date:** 2026-09-26

## Deployment

- Provider: Cloudflare Pages
- Project: `the-world-changed`
- Repository: `Faadil1/THE-WORLD-CHANGED`
- Branch: `build/comprehension-v0`
- Deployed commit: `ea8a2672c17a9e2ba8f5067f4ccf483f2a343dbb`
- Build command: `npm run build`
- Output directory: `dist`
- Public URL: https://the-world-changed.pages.dev/

## Pre-deploy validation

Cloudflare deployment was performed only after the branch's existing validation had passed:

- `npm test`: 145/145
- `npm run typecheck`: pass
- `npm run build`: pass

## Public deployment verification

Verified against the public `pages.dev` URL:

- page loads successfully;
- primary comprehension hero renders;
- PROOF is collapsed on first load;
- PULL THE GAP responds;
- ADMIN REVOKES ACCESS can be positioned in the gap;
- CHECK AT COMMIT can be enabled;
- causal register exposes:
  `OBSERVED CORRECTLY -> WORLD CHANGED -> OBSERVATION STALE -> ACTS`;
- no visual breakage was detected in the desktop verification.

## Verification caveats

A second targeted browser run was started to verify the complete guarded resolution and a mobile-sized public viewport.

That automation failed inside the browser-automation service while attempting the final pull-pin step. This is **not evidence of an application failure**.

Therefore, as of this evidence record:

- desktop public deployment: VERIFIED;
- public first-load PROOF state: VERIFIED;
- public gap/revoke/check interactions: VERIFIED;
- final guarded `RE-CHECKED -> STOPPED / BLOCKED` state: already machine-validated locally, but the targeted public browser re-check was inconclusive due to automation-service failure;
- mobile public viewport: not independently browser-verified in this deployment session.

No product code, live receipt, or scenario was changed during deployment.
