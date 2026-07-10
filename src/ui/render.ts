import type { Recommendation, RigSpec } from "../lib/types";
import { fitBadgeCopy, formatContextDetail, formatHeadroom } from "./format";

function slugId(rec: Recommendation): string {
  return `detail-${rec.variant.modelId}-${rec.variant.quant}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

/**
 * One ranked result card: name, quant, fit badge, and trending badge always visible; VRAM/RAM
 * headroom math and achievable context revealed on expand. The header is a real <button> so
 * Enter/Space toggling and aria-expanded come for free from native semantics.
 */
export function renderResultCard(rec: Recommendation, spec: RigSpec): HTMLElement {
  const card = document.createElement("article");
  card.className = `result-card result-card--${rec.fit}`;

  const header = document.createElement("button");
  header.type = "button";
  header.className = "result-card__header";
  header.setAttribute("aria-expanded", "false");

  const detailId = slugId(rec);
  header.setAttribute("aria-controls", detailId);

  const badge = fitBadgeCopy(rec.fit);

  const nameEl = document.createElement("span");
  nameEl.className = "result-card__name";
  nameEl.textContent = rec.variant.displayName;

  const quantEl = document.createElement("span");
  quantEl.className = "result-card__quant";
  quantEl.textContent = rec.variant.quant;

  const badgesEl = document.createElement("span");
  badgesEl.className = "result-card__badges";

  if (rec.trending) {
    const trendingBadge = document.createElement("span");
    trendingBadge.className = "badge badge--trending";
    trendingBadge.setAttribute("aria-label", "Trending this week");
    trendingBadge.textContent = "Trending";
    badgesEl.append(trendingBadge);
  }

  const fitBadge = document.createElement("span");
  fitBadge.className = `badge badge--${rec.fit}`;
  fitBadge.setAttribute("aria-label", badge.ariaLabel);
  fitBadge.textContent = badge.label;
  badgesEl.append(fitBadge);

  header.append(nameEl, quantEl, badgesEl);

  const detail = document.createElement("div");
  detail.className = "result-card__detail";
  detail.id = detailId;
  detail.hidden = true;

  const contextEl = document.createElement("p");
  contextEl.textContent = formatContextDetail(rec);

  const headroomEl = document.createElement("p");
  headroomEl.textContent = formatHeadroom(rec, spec);

  detail.append(contextEl, headroomEl);

  if (rec.offloaded) {
    const offloadNote = document.createElement("p");
    offloadNote.className = "result-card__offload-note";
    offloadNote.textContent = "Requires offloading part of the model to system RAM.";
    detail.append(offloadNote);
  }

  header.addEventListener("click", () => {
    const expanded = header.getAttribute("aria-expanded") === "true";
    header.setAttribute("aria-expanded", String(!expanded));
    detail.hidden = expanded;
  });

  card.append(header, detail);
  return card;
}

export function renderEmptyState(message: string): HTMLElement {
  const empty = document.createElement("p");
  empty.className = "results-empty";
  empty.textContent = message;
  return empty;
}

/**
 * Renders the full results list into `container`, replacing any prior content. Recommendations
 * pop in with a small staggered delay via a CSS custom property so they read as populating
 * rather than appearing all at once (skipped visually under prefers-reduced-motion via CSS).
 */
export function renderResultsList(container: HTMLElement, recs: Recommendation[], spec: RigSpec): void {
  container.replaceChildren();

  if (recs.length === 0) {
    container.append(renderEmptyState("Nothing in the catalog fits that rig yet — try a lower-VRAM tier."));
    return;
  }

  recs.forEach((rec, index) => {
    const card = renderResultCard(rec, spec);
    card.style.setProperty("--stagger-index", String(index));
    container.append(card);
  });
}
