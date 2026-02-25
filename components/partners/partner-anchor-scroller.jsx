"use client";

import { useEffect } from "react";

function isVisible(element) {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findAnchorElement(anchorId) {
  if (!anchorId) {
    return null;
  }

  const byId = document.getElementById(anchorId);
  if (byId && isVisible(byId)) {
    return byId;
  }

  const escape = typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(anchorId)
    : anchorId.replace(/["'\\]/g, "\\$&");

  const byData = document.querySelector(`[data-anchor-id="${escape}"]`);
  if (byData && isVisible(byData)) {
    return byData;
  }

  return byData || byId || null;
}

function resolveHighlightTarget(element) {
  if (!element) {
    return null;
  }

  const root = element.closest("[data-anchor-highlight-root]");
  if (root && isVisible(root)) {
    return root;
  }

  return element;
}

function highlightElement(element) {
  if (!element) {
    return;
  }

  const previousBackground = element.style.backgroundColor;
  const previousBoxShadow = element.style.boxShadow;
  const previousTransition = element.style.transition;

  element.style.transition = previousTransition
    ? `${previousTransition}, background-color 0.4s ease, box-shadow 0.4s ease`
    : "background-color 0.4s ease, box-shadow 0.4s ease";
  element.style.backgroundColor = "rgba(59, 130, 246, 0.12)";
  element.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.25)";

  const revert = () => {
    element.style.backgroundColor = previousBackground;
    element.style.boxShadow = previousBoxShadow;
    element.style.transition = previousTransition;
  };

  window.setTimeout(revert, 1800);
}

function scrollToAnchor(anchorId, anchorIdsSet) {
  if (!anchorId || (anchorIdsSet && anchorIdsSet.size > 0 && !anchorIdsSet.has(anchorId))) {
    return;
  }

  const element = findAnchorElement(anchorId);
  if (!element) {
    return;
  }

  window.requestAnimationFrame(() => {
    const highlightTarget = resolveHighlightTarget(element);
    const scrollTarget = highlightTarget ?? element;

    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    if (typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }

    highlightElement(highlightTarget);
  });
}

export function PartnerAnchorScroller({ anchorIds }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const ids = Array.isArray(anchorIds) ? anchorIds.filter(Boolean) : [];
    const anchorIdsSet = ids.length ? new Set(ids) : null;

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      scrollToAnchor(hash, anchorIdsSet);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [Array.isArray(anchorIds) ? anchorIds.join("|") : ""]);

  return null;
}
