// extension/content/lasso-freeform.js - Freeform Lasso for Lasso Copy
// This module handles freeform selection mode

(function () {
  "use strict";

  // State (from main content.js)
  var state = window.__lassoState;
  var PATH_SAMPLE_DISTANCE = 8;

  // Freeform-specific functions
  function updateLassoPath() {
    if (!state.elements.lassoPath) return;

    var points = state.pathPoints;

    if (points.length < 2) {
      state.elements.lassoPath.setAttribute("d", "");
      return;
    }

    var d = "M " + points[0].x + " " + points[0].y;

    for (var i = 1; i < points.length; i++) {
      d += " L " + points[i].x + " " + points[i].y;
    }

    if (points.length > 2) {
      d += " Z";
    }

    state.elements.lassoPath.setAttribute("d", d);

    // Hide rectangle
    if (state.elements.lassoRect) {
      state.elements.lassoRect.style.display = "none";
    }
  }

  function detectFreeformElements() {
    var points = state.pathPoints;

    if (points.length < 3) {
      state.selectedElements = [];
      return [];
    }

    // Get bounding box first for quick rejection
    var bbox = getPathBoundingBox(points);

    if (!bbox || bbox.width < 5 || bbox.height < 5) {
      state.selectedElements = [];
      return [];
    }

    var candidates =
      state.candidates.length > 0 ? state.candidates : getCandidateElements();

    var found = [];
    var seen = new Set();

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (seen.has(el)) continue;

      try {
        var rect = el.getBoundingClientRect();

        // Quick bounding box check first
        if (!bboxIntersect(bbox, rect)) continue;

        // Then do polygon intersection check
        if (polygonRectIntersect(points, rect)) {
          found.push(el);
          seen.add(el);
        }
      } catch (e) {
        // Element might be detached
      }
    }

    state.selectedElements = sortByDOMOrder(found);
    return state.selectedElements;
  }

  function getPathBoundingBox(points) {
    var minX = Infinity,
      minY = Infinity;
    var maxX = -Infinity,
      maxY = -Infinity;

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  function bboxIntersect(a, b) {
    return !(
      a.right < b.left ||
      a.left > b.right ||
      a.bottom < b.top ||
      a.top > b.bottom
    );
  }

  function polygonRectIntersect(polygon, rect) {
    var rectPoints = [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom },
      { x: rect.left, y: rect.bottom },
    ];

    // Check if any polygon point is inside the rectangle
    for (var i = 0; i < polygon.length; i++) {
      if (pointInRect(polygon[i], rect)) {
        return true;
      }
    }

    // Check if any rectangle corner is inside the polygon
    for (var j = 0; j < rectPoints.length; j++) {
      if (pointInPolygon(rectPoints[j], polygon)) {
        return true;
      }
    }

    // Check if polygon edges intersect rectangle edges
    for (var k = 0; k < polygon.length; k++) {
      var p1 = polygon[k];
      var p2 = polygon[(k + 1) % polygon.length];

      for (var m = 0; m < 4; m++) {
        var r1 = rectPoints[m];
        var r2 = rectPoints[(m + 1) % 4];

        if (lineSegmentsIntersect(p1, p2, r1, r2)) {
          return true;
        }
      }
    }

    return false;
  }

  function pointInRect(point, rect) {
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  }

  function pointInPolygon(point, polygon) {
    var inside = false;
    var n = polygon.length;

    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = polygon[i].x,
        yi = polygon[i].y;
      var xj = polygon[j].x,
        yj = polygon[j].y;

      if (
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  function lineSegmentsIntersect(p1, p2, p3, p4) {
    var denominator =
      (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

    if (denominator === 0) return false;

    var ua =
      ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
      denominator;
    var ub =
      ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
      denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  function getCandidateElements() {
    var CANDIDATE_SELECTOR =
      "p,h1,h2,h3,h4,h5,h6,table,thead,tbody,tr,th,td,ul,ol,li,img,figure,figcaption,blockquote,pre,code,section,article,aside,header,footer,main,div,span,a";
    return Array.from(document.querySelectorAll(CANDIDATE_SELECTOR));
  }

  function isVisibleElement(el) {
    var style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }
    var rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return false;
    }
    return true;
  }

  function sortByDOMOrder(elements) {
    return [].slice.call(elements).sort(function (a, b) {
      if (a.contains(b)) return -1;
      if (b.contains(a)) return 1;

      var rectA = a.getBoundingClientRect();
      var rectB = b.getBoundingClientRect();

      var verticalDiff = Math.abs(rectA.top - rectB.top);
      if (verticalDiff > 10) {
        return rectA.top - rectB.top;
      }

      return rectA.left - rectB.left;
    });
  }

  // Handle mouse down for freeform mode
  function handleFreeformMouseDown(e) {
    state.pathPoints = [{ x: e.clientX, y: e.clientY }];
    updateLassoPath();
  }

  // Handle mouse move for freeform mode
  function handleFreeformMouseMove(e) {
    var lastPoint = state.pathPoints[state.pathPoints.length - 1];
    var newPoint = { x: e.clientX, y: e.clientY };

    var distance = Math.sqrt(
      Math.pow(newPoint.x - lastPoint.x, 2) +
        Math.pow(newPoint.y - lastPoint.y, 2),
    );

    if (distance >= PATH_SAMPLE_DISTANCE) {
      state.pathPoints.push(newPoint);
      updateLassoPath();
    }

    detectFreeformElements();
    renderHighlights(state.selectedElements);
  }

  // Export functions to global state
  window.__lassoFreeform = {
    updateLassoPath: updateLassoPath,
    detectElements: detectFreeformElements,
    handleMouseDown: handleFreeformMouseDown,
    handleMouseMove: handleFreeformMouseMove,
  };
})();
