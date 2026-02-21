This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Email Sending Setup

EcomCRM uses [Resend](https://resend.com) for transactional and marketing email delivery. Before sending emails, complete the following setup steps.

### Domain Verification

Resend requires you to verify a sending domain before emails can be delivered. It is strongly recommended to use a dedicated subdomain (e.g. `marketing.your-store.com`) so your main domain reputation is not affected by bulk sending.

Follow the [Resend domain verification guide](https://resend.com/docs/dashboard/domains/introduction) to verify your domain.

### DNS Records Checklist

Add the following DNS records to your domain (DNS propagation can take up to 48 hours):

- **SPF** (TXT record on your sending domain):
  ```
  v=spf1 include:amazonses.com ~all
  ```
- **DKIM**: Automatically configured by Resend during domain verification — no manual setup required.
- **DMARC** (TXT record at `_dmarc.your-domain.com`):
  ```
  v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com
  ```

### Env Vars

Set the following environment variables (see `.env.local.example` for details):

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | API key from resend.com (requires send permission) |
| `RESEND_FROM_NAME` | Display name shown in recipient inboxes (e.g. "Your Store Name") |
| `RESEND_FROM_EMAIL` | Full sending address on your verified domain (e.g. `hello@marketing.your-store.com`) |
| `RESEND_REPLY_TO` | Optional reply-to address — omit for noreply behavior |
| `APP_URL` | Public base URL of your deployment, used to generate unsubscribe links (e.g. `https://your-app.vercel.app`) |
