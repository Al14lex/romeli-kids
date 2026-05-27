document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("filters-form");
  const applyBtn = document.getElementById("apply-filters");
  const resetBtn = document.getElementById("reset-filters");
  const grid = document.getElementById("products-grid");

  const FUZZY_THRESHOLD = 0.8;
  const FILTER_DEBUG = window.__FILTERS_DEBUG__ === true;
  const DEBUG_MAX_LOGS_PER_APPLY = 1;

  if (!form || !applyBtn || !resetBtn || !grid) return;

  const POLISH_CHAR_MAP = {
    "\u0105": "a",
    "\u0107": "c",
    "\u0119": "e",
    "\u0142": "l",
    "\u0144": "n",
    "\u00f3": "o",
    "\u015b": "s",
    "\u017c": "z",
    "\u017a": "z",
  };

  function normalizeText(value) {
    if (!value) return "";

    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017c\u017a]/g, (char) => (
        POLISH_CHAR_MAP[char] || char
      ))
      .replace(/[^a-z0-9\s/\\|,;\-\u2013\u2014]/g, " ")
      .replace(/[\-\u2013\u2014_.,()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compact(value) {
    return value.replace(/\s+/g, "");
  }

  function extractTokens(value) {
    return normalizeText(value).match(/[a-z0-9]+/g) || [];
  }

  function levenshteinDistance(a, b) {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
    for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[a.length][b.length];
  }

  function parseSelectedTypeAlternatives(selectedTypes) {
    return selectedTypes
      .flatMap((rawValue) => String(rawValue)
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean))
      .map((alternativeRaw) => {
        const normalized = normalizeText(alternativeRaw);
        return {
          raw: alternativeRaw,
          normalized,
          compact: compact(normalized),
          tokens: extractTokens(alternativeRaw),
        };
      })
      .filter((alternative) => alternative.normalized && alternative.tokens.length > 0);
  }

  function fuzzyTokenSimilarity(leftToken, rightToken) {
    if (!leftToken || !rightToken) return null;
    if (leftToken.length < 3 || rightToken.length < 3) return null;
    if (Math.abs(leftToken.length - rightToken.length) > 1) return null;
    if (leftToken[0] !== rightToken[0]) return null;

    const distance = levenshteinDistance(leftToken, rightToken);
    if (distance > 1) return null;

    const similarity = 1 - (distance / Math.max(leftToken.length, rightToken.length));
    if (similarity < FUZZY_THRESHOLD) return null;

    return similarity;
  }

  function matchAllAlternativeTokens(alternativeTokens, productTokens, productTokenSet) {
    let fuzzyUsed = false;
    const fuzzyPairs = [];

    for (const selectedToken of alternativeTokens) {
      if (productTokenSet.has(selectedToken)) continue;

      let bestMatch = null;
      let bestSimilarity = -1;

      for (const productToken of productTokens) {
        const similarity = fuzzyTokenSimilarity(selectedToken, productToken);
        if (similarity === null || similarity <= bestSimilarity) continue;
        bestSimilarity = similarity;
        bestMatch = productToken;
      }

      if (!bestMatch) return null;

      fuzzyUsed = true;
      fuzzyPairs.push({
        selectedToken,
        productToken: bestMatch,
        similarity: bestSimilarity,
      });
    }

    return {
      fuzzyUsed,
      fuzzyPairs,
    };
  }

  function matchesType(productType, selectedTypes) {
    if (!selectedTypes.length) {
      return {
        matched: true,
        rule: "type-not-selected",
        matchedAlternative: null,
        productNormalized: normalizeText(productType),
        productTokens: extractTokens(productType),
        selectedFilterTokens: [],
      };
    }

    const productNormalized = normalizeText(productType);
    const productCompact = compact(productNormalized);
    const productTokens = extractTokens(productType);
    const productTokenSet = new Set(productTokens);
    const alternatives = parseSelectedTypeAlternatives(selectedTypes);
    const selectedFilterTokens = alternatives.flatMap((alternative) => alternative.tokens);

    if (!productNormalized || !productTokens.length || !alternatives.length) {
      return {
        matched: false,
        rule: "type-no-valid-data",
        matchedAlternative: null,
        productNormalized,
        productTokens,
        selectedFilterTokens,
      };
    }

    for (const alternative of alternatives) {
      if (alternative.normalized === productNormalized) {
        return {
          matched: true,
          rule: "type-exact-normalized",
          matchedAlternative: alternative.raw,
          productNormalized,
          productTokens,
          selectedFilterTokens,
        };
      }

      if (alternative.compact && alternative.compact === productCompact) {
        return {
          matched: true,
          rule: "type-exact-compact",
          matchedAlternative: alternative.raw,
          productNormalized,
          productTokens,
          selectedFilterTokens,
        };
      }

      if (alternative.tokens.length === 1 && productTokenSet.has(alternative.tokens[0])) {
        return {
          matched: true,
          rule: "type-exact-token",
          matchedAlternative: alternative.raw,
          productNormalized,
          productTokens,
          selectedFilterTokens,
        };
      }

      if (alternative.tokens.length > 1 && alternative.tokens.every((token) => productTokenSet.has(token))) {
        return {
          matched: true,
          rule: "type-exact-words",
          matchedAlternative: alternative.raw,
          productNormalized,
          productTokens,
          selectedFilterTokens,
        };
      }

      const tokenMatch = matchAllAlternativeTokens(
        alternative.tokens,
        productTokens,
        productTokenSet
      );

      if (tokenMatch?.fuzzyUsed) {
        const fuzzySummary = tokenMatch.fuzzyPairs
          .map((pair) => `${pair.selectedToken}~${pair.productToken}:${pair.similarity.toFixed(2)}`)
          .join(",");

        return {
          matched: true,
          rule: `type-fuzzy-words(${fuzzySummary})`,
          matchedAlternative: alternative.raw,
          productNormalized,
          productTokens,
          selectedFilterTokens,
        };
      }
    }

    return {
      matched: false,
      rule: "type-no-match",
      matchedAlternative: null,
      productNormalized,
      productTokens,
      selectedFilterTokens,
    };
  }

  function normalizeSizeText(value) {
    if (!value) return "";

    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017c\u017a]/g, (char) => (
        POLISH_CHAR_MAP[char] || char
      ))
      .replace(/\s+/g, " ");
  }

  function toRanges(rawValue) {
    const text = normalizeSizeText(rawValue).replace(/^rozmiar\s*:\s*/, "");
    if (!text) return [];

    const segments = text.split(/[\\/,;|]+/).map((item) => item.trim()).filter(Boolean);
    const source = segments.length ? segments : [text];

    return source.flatMap((segment) => {
      const numbers = segment.match(/\d+/g)?.map((num) => Number.parseInt(num, 10)) || [];
      if (!numbers.length) return [];

      if (/[-\u2013\u2014]/.test(segment) && numbers.length >= 2) {
        const min = Math.min(numbers[0], numbers[1]);
        const max = Math.max(numbers[0], numbers[1]);
        return [{ min, max }];
      }

      return numbers.map((value) => ({ min: value, max: value }));
    });
  }

  function rangesOverlap(a, b) {
    return a.min <= b.max && b.min <= a.max;
  }

  function matchesSizes(productSizeText, selectedSizes) {
    if (!selectedSizes.length) return true;

    const productRanges = toRanges(productSizeText);
    const selectedRanges = selectedSizes.flatMap((size) => toRanges(size));
    if (!productRanges.length || !selectedRanges.length) return false;

    return selectedRanges.some((selectedRange) => (
      productRanges.some((productRange) => rangesOverlap(selectedRange, productRange))
    ));
  }

  function applyFilters() {
    const formData = new FormData(form);
    const selectedTypes = formData.getAll("type");
    const selectedSizes = formData.getAll("size_cm");
    const extras = formData.getAll("extra");
    let debugLogsLeft = DEBUG_MAX_LOGS_PER_APPLY;

    const cards = grid.querySelectorAll(".product-card");

    cards.forEach((card) => {
      const typeText = card.querySelector(".product-title")?.textContent || "";
      const sizeText = card.querySelector(".product-size")?.textContent || "";
      const typeMatch = matchesType(typeText, selectedTypes);
      const isSaleMatch = !extras.includes("sale") || !!card.querySelector(".sale-price");
      const isNewMatch = !extras.includes("new") || !!card.querySelector(".new-badge");

      if (FILTER_DEBUG && selectedTypes.length > 0 && debugLogsLeft > 0) {
        debugLogsLeft -= 1;
        console.debug("[filters:type]", {
          originalTypeTitle: typeText,
          normalizedTokens: typeMatch.productTokens,
          selectedFilterTokens: typeMatch.selectedFilterTokens,
          matched: typeMatch.matched,
          rule: typeMatch.rule,
          matchedAlternative: typeMatch.matchedAlternative,
        });
      }

      const visible = typeMatch.matched
        && matchesSizes(sizeText, selectedSizes)
        && isSaleMatch
        && isNewMatch;

      card.style.display = visible ? "" : "none";
    });
  }

  applyBtn.addEventListener("click", applyFilters);

  resetBtn.addEventListener("click", () => {
    const cards = grid.querySelectorAll(".product-card");
    cards.forEach((card) => {
      card.style.display = "";
    });
  });
});
