# Project rules for AI agent

## Goal
Refactor product model and upload flow from "1 photo = 1 product" to "1 product = many photos".

## Must keep
- Public product card CSS classes on girls.html and boys.html must not be renamed.
- Existing filters UI must keep working.
- Existing old products with `imageUrl` must still render (treat as images[0]).

## Backend structure
- Product model: backend/src/models/Product.js
- Routes: backend/src/routes/products.js
- S3 helper: backend/src/utils/s3.js
- App entry: backend/src/app.js

## Frontend structure
- Admin page: frontend/admin.html + frontend/js/admin.js
- Public pages: frontend/girls.html, frontend/boys.html
- Rendering: frontend/js/render-products.js

## New required behavior
- Admin creates ONE product draft card.
- Admin can select multiple images for the product.
- Admin can choose which image is COVER.
- One upload request = one product saved in MongoDB with images[] + coverIndex (or coverUrl).
- Public card shows cover image.
- Clicking product opens gallery modal with swipe/next/prev to browse all images.

## Constraints
- Use existing endpoints naming if possible, but the request must create ONE product per request.
- Prefer backward-compatible API and renderer.