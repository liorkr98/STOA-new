# Stoa auth emails

Two templates in Stoa's voice, replacing Supabase's defaults: the sign-up
confirmation and the password reset. Paper and ink, a serif headline, mono
labels, one button. Table layout with inline styles and no external CSS or
web fonts, so they render the same in Gmail, Outlook, Apple Mail and the rest
(Georgia stands in for Fraunces and the system sans for Plex; email clients
do not load web fonts reliably).

## Where they go

Supabase dashboard, project `cqhenicrfdkbsshyszex`:

**Authentication → Emails → Templates**

| Template tab      | File                    | Subject line to paste            |
| ----------------- | ----------------------- | -------------------------------- |
| Confirm sign up   | `confirm-signup.html`   | `Confirm your address on Stoa`   |
| Reset password    | `reset-password.html`   | `Set a new Stoa password`        |

Paste the whole file into the template's body box (replace everything that is
there), paste the subject, and save. Nothing else in the file needs editing:
`{{ .SiteURL }}` and `{{ .TokenHash }}` are filled in by Supabase.

## Two settings the links depend on

**Authentication → URL Configuration**

- **Site URL** must be `https://www.stoamarket.ai`. Both templates build their
  link from it. (`stoa.app` does not resolve, so if it is still set there the
  links in every email point at nothing.)
- **Redirect URLs** must include `https://www.stoamarket.ai/auth/callback`,
  `https://www.stoamarket.ai/auth/confirm`, `http://localhost:3000/auth/callback`
  and `http://localhost:3000/auth/confirm`, plus the same two paths on any
  Vercel preview domain you test from.

## Why the link looks different from Supabase's default

The default `{{ .ConfirmationURL }}` bounces through Supabase's server and only
signs the person in if the same browser tab that signed up is still around.
These templates link straight to Stoa's `/auth/confirm` with a one-time token
hash. The app redeems it, sets the session and lands the person on Today (or on
the new-password page for a reset), from any device. The app also still accepts
the default link, so nothing breaks in the gap before these are pasted.
