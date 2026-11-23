// Pure helpers for validating product fields and planning image changes.
// Kept free of Express/Mongoose so they can be tested on their own.

const NOTES_MAX_LENGTH = 300;
const ALLOWED_CATEGORIES = new Set(['girls', 'boys']);

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

function parsePrice(raw, { required, field }) {
  if (isBlank(raw)) {
    if (required) throw new ValidationError(`${field} is required.`);
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${field} must be a number >= 0.`);
  }
  return value;
}

function parseRequiredText(raw, field) {
  if (isBlank(raw)) throw new ValidationError(`${field} is required.`);
  return String(raw).trim();
}

function parseNotes(raw) {
  if (isBlank(raw)) return '';
  const notes = String(raw).trim();
  if (notes.length > NOTES_MAX_LENGTH) {
    throw new ValidationError(`notes must be at most ${NOTES_MAX_LENGTH} characters.`);
  }
  return notes;
}

function parseCategory(raw) {
  if (!ALLOWED_CATEGORIES.has(raw)) {
    throw new ValidationError("category must be 'girls' or 'boys'.");
  }
  return raw;
}

// Images stored on the product, with legacy single imageUrl treated as images[0].
function currentImagesOf(product) {
  const stored = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  if (stored.length) return stored;
  return product?.imageUrl ? [product.imageUrl] : [];
}

function parseKeepImages(raw, currentImages) {
  if (raw === undefined) return [...currentImages];

  let list;
  try {
    list = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new ValidationError('keepImages must be a JSON array.');
  }
  if (!Array.isArray(list)) throw new ValidationError('keepImages must be a JSON array.');

  const allowed = new Set(currentImages);
  const seen = new Set();
  const kept = [];
  for (const url of list) {
    if (typeof url !== 'string' || !allowed.has(url)) {
      throw new ValidationError('keepImages contains an image that does not belong to this product.');
    }
    if (!seen.has(url)) {
      seen.add(url);
      kept.push(url);
    }
  }
  return kept;
}

// Final order = kept existing images, then newly uploaded ones.
// coverIndex points into that final list.
function planImageUpdate({ currentImages, keepImages, newCount, coverIndex }) {
  const total = keepImages.length + newCount;
  if (total === 0) throw new ValidationError('A product must have at least one image.');

  const parsedCover = Number.parseInt(coverIndex, 10);
  const cover = Number.isInteger(parsedCover) ? parsedCover : 0;
  if (cover < 0 || cover >= total) throw new ValidationError('coverIndex is out of range.');

  const keepSet = new Set(keepImages);
  const removed = currentImages.filter((url) => !keepSet.has(url));

  return { coverIndex: cover, removed };
}

module.exports = {
  NOTES_MAX_LENGTH,
  ALLOWED_CATEGORIES,
  ValidationError,
  parsePrice,
  parseRequiredText,
  parseNotes,
  parseCategory,
  currentImagesOf,
  parseKeepImages,
  planImageUpdate,
};
