// Token Checker - Figma Plugin Main Thread
// Figma 샌드박스에서 실행되는 플러그인 로직

// ─── 플러그인 초기화 ───────────────────────────────────────────────────────────
figma.showUI(__html__, { width: 420, height: 580, themeColors: true });

// ─── 메시지 수신 ──────────────────────────────────────────────────────────────
figma.ui.onmessage = async (msg) => {
  if (msg.type === "scan") {
    await handleScan(msg.tokens);
  }

  if (msg.type === "select-node") {
    const node = figma.getNodeById(msg.nodeId);
    if (node) {
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
  }

  if (msg.type === "close") {
    figma.closePlugin();
  }
};

// ─── 스캔 핸들러 ──────────────────────────────────────────────────────────────
async function handleScan(tokens) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "프레임을 먼저 선택해주세요.",
    });
    return;
  }

  const issues = [];
  let totalScanned = 0;

  for (const node of selection) {
    traverseNode(node, tokens, issues, (count) => {
      totalScanned += count;
    });
  }

  figma.ui.postMessage({
    type: "scan-result",
    issues,
    totalScanned,
    selectionCount: selection.length,
  });
}

// ─── 노드 순회 ────────────────────────────────────────────────────────────────
function traverseNode(node, tokens, issues, countCallback) {
  countCallback(1);

  // fills 검사 (배경색, 텍스트 색상 포함)
  if ("fills" in node && Array.isArray(node.fills)) {
    const fillIssues = checkFills(node, node.fills, tokens, "fill");
    issues.push(...fillIssues);
  }

  // strokes 검사 (테두리 색상)
  if ("strokes" in node && Array.isArray(node.strokes)) {
    const strokeIssues = checkFills(node, node.strokes, tokens, "stroke");
    issues.push(...strokeIssues);
  }

  // 자식 노드 재귀 순회
  if ("children" in node) {
    for (const child of node.children) {
      traverseNode(child, tokens, issues, countCallback);
    }
  }
}

// ─── 색상 검사 ────────────────────────────────────────────────────────────────
function checkFills(node, fills, tokens, kind) {
  const issues = [];

  fills.forEach((fill, index) => {
    // SOLID 타입만 검사 (그라디언트, 이미지 등은 제외)
    if (fill.type !== "SOLID") return;
    if (fill.visible === false) return;

    // 변수 바인딩(토큰) 여부 확인
    const boundVars = node.boundVariables;
    const fillKey = kind === "fill" ? "fills" : "strokes";

    if (boundVars && boundVars[fillKey]) {
      const binding = Array.isArray(boundVars[fillKey])
        ? boundVars[fillKey][index]
        : boundVars[fillKey];
      if (binding) return; // 변수(토큰)가 바인딩되어 있으면 OK
    }

    // 색상 HEX 변환
    const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
    const alpha = fill.opacity !== undefined ? fill.opacity : 1;

    // 토큰 리스트와 비교
    const matchedToken = findMatchingToken(hex, tokens);
    if (matchedToken) return; // 토큰 값과 일치하면 OK

    // 가장 유사한 토큰 찾기
    const closestToken = findClosestToken(hex, tokens);

    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      kind,
      hex,
      alpha: Math.round(alpha * 100),
      closestToken,
      path: getNodePath(node),
    });
  });

  return issues;
}

// ─── 토큰 매칭 ────────────────────────────────────────────────────────────────
function findMatchingToken(hex, tokens) {
  const normalizedHex = hex.toUpperCase();
  for (const [name, value] of Object.entries(tokens)) {
    if (value.toUpperCase() === normalizedHex) {
      return name;
    }
  }
  return null;
}

function findClosestToken(hex, tokens) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  let minDistance = Infinity;
  let closest = null;

  for (const [name, value] of Object.entries(tokens)) {
    const tokenRgb = hexToRgb(value);
    if (!tokenRgb) continue;

    const distance = colorDistance(rgb, tokenRgb);
    if (distance < minDistance) {
      minDistance = distance;
      closest = { name, value, distance: Math.round(distance) };
    }
  }

  return closest;
}

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────
function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
      .toUpperCase()
  );
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function colorDistance(a, b) {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2)
  );
}

function getNodePath(node) {
  const parts = [];
  let current = node.parent;
  while (current && current.type !== "PAGE") {
    parts.unshift(current.name);
    current = current.parent;
  }
  return parts.join(" › ");
}
