# MalusCorp™ Clean Room as a Service

## About

This is a website that provides "clean room" reverse engineering as a service. Pay-first flow: backend creates Stripe Checkout Session; after payment, user uploads package.json on the status page.

## Local testing (frontend + backend)

1. Edit `config.js`:
   - `BACKEND_API_URL` – backend base URL (e.g. `http://localhost:8000`)
   - `STATUS_BUCKET_URL` – your S3 bucket URL (matches backend `S3_PUBLIC_URL`)

2. Backend success URL: `http://localhost:8080/status.html?session_id={CHECKOUT_SESSION_ID}`

3. Serve frontend locally:
   ```bash
   npx serve . -p 8080
   ```

4. Open http://localhost:8080 

