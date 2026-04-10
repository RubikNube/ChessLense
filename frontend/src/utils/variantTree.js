import { Chess, DEFAULT_POSITION } from "chess.js";

export const ROOT_VARIANT_NODE_ID = "root";
export const VARIANT_TREE_VERSION = 1;

function createRootNode(initialFen) {
  return {
    id: ROOT_VARIANT_NODE_ID,
    parentId: null,
    children: [],
    move: null,
    san: null,
    fen: initialFen,
    ply: 0,
    moveNumber: 0,
    side: null,
  };
}

function createGameForFen(initialFen = DEFAULT_POSITION) {
  return new Chess(initialFen);
}

function clonePositionGame(game) {
  return new Chess(game.fen());
}

function normalizeStoredMove(move) {
  if (
    !move ||
    typeof move !== "object" ||
    typeof move.from !== "string" ||
    typeof move.to !== "string"
  ) {
    return null;
  }

  return {
    from: move.from,
    to: move.to,
    ...(typeof move.promotion === "string"
      ? { promotion: move.promotion.toLowerCase() }
      : {}),
  };
}

function cloneNode(node) {
  return {
    ...node,
    children: [...node.children],
    move: node.move ? { ...node.move } : null,
  };
}

function cloneNodes(nodes) {
  return Object.fromEntries(
    Object.entries(nodes).map(([nodeId, node]) => [nodeId, cloneNode(node)]),
  );
}

function isValidFen(fen) {
  if (typeof fen !== "string" || !fen.trim()) {
    return false;
  }

  try {
    createGameForFen(fen);
    return true;
  } catch {
    return false;
  }
}

function getInitialFenFromGame(game) {
  if (!(game instanceof Chess)) {
    return DEFAULT_POSITION;
  }

  if (!game.history().length) {
    return game.fen();
  }

  const replay = new Chess();

  try {
    replay.loadPgn(game.pgn());
  } catch {
    return DEFAULT_POSITION;
  }

  while (replay.undo()) {
    // Walk back to the initial position, including custom FEN setups.
  }

  return replay.fen();
}

function createBaseVariantTree(initialFen = DEFAULT_POSITION) {
  const normalizedInitialFen = isValidFen(initialFen) ? initialFen : DEFAULT_POSITION;

  return {
    version: VARIANT_TREE_VERSION,
    initialFen: normalizedInitialFen,
    rootId: ROOT_VARIANT_NODE_ID,
    currentNodeId: ROOT_VARIANT_NODE_ID,
    activeLineLeafId: ROOT_VARIANT_NODE_ID,
    rememberedMainlineNodeId: ROOT_VARIANT_NODE_ID,
    nextNodeIndex: 1,
    nodes: {
      [ROOT_VARIANT_NODE_ID]: createRootNode(normalizedInitialFen),
    },
  };
}

function createNodeFromMove(nodeId, parentNode, move, fen) {
  const ply = parentNode.ply + 1;

  return {
    id: nodeId,
    parentId: parentNode.id,
    children: [],
    move: normalizeStoredMove(move),
    san: move.san,
    fen,
    ply,
    moveNumber: Math.floor((ply - 1) / 2) + 1,
    side: move.color === "b" ? "black" : "white",
  };
}

function findNodePathIds(tree, targetNodeId) {
  const path = [];
  let currentNodeId = tree.nodes[targetNodeId] ? targetNodeId : tree.rootId;

  while (currentNodeId) {
    path.unshift(currentNodeId);
    currentNodeId = tree.nodes[currentNodeId]?.parentId ?? null;
  }

  return path;
}

function isAncestorNode(tree, ancestorId, targetId) {
  let currentNodeId = targetId;

  while (currentNodeId) {
    if (currentNodeId === ancestorId) {
      return true;
    }

    currentNodeId = tree.nodes[currentNodeId]?.parentId ?? null;
  }

  return false;
}

function addChildToParent(parentNode, childId, { makeMain = false } = {}) {
  const children = parentNode.children.filter((existingChildId) => existingChildId !== childId);
  parentNode.children = makeMain ? [childId, ...children] : [...children, childId];
}

function appendMoveNode(tree, parentId, move, { makeMain = false } = {}) {
  const parentNode = tree.nodes[parentId];
  const game = buildGameToNode(tree, parentId);
  const appliedMove = game.move(move);

  if (!appliedMove) {
    return null;
  }

  const nodeId = `node-${tree.nextNodeIndex}`;
  tree.nextNodeIndex += 1;

  tree.nodes[nodeId] = createNodeFromMove(nodeId, parentNode, appliedMove, game.fen());
  addChildToParent(parentNode, nodeId, { makeMain });

  return nodeId;
}

function reorderChildren(parentNode, childId, targetIndex) {
  const nextChildren = parentNode.children.filter((candidateId) => candidateId !== childId);
  nextChildren.splice(targetIndex, 0, childId);
  parentNode.children = nextChildren;
}

function collectReachableNodeIds(nodes, rootId) {
  const reachableNodeIds = new Set();
  const stack = [rootId];

  while (stack.length > 0) {
    const currentNodeId = stack.pop();

    if (!currentNodeId || reachableNodeIds.has(currentNodeId) || !nodes[currentNodeId]) {
      continue;
    }

    reachableNodeIds.add(currentNodeId);

    for (const childId of nodes[currentNodeId].children) {
      stack.push(childId);
    }
  }

  return reachableNodeIds;
}

function sanitizeNode(rawNode, nodeId, nodes, parentId) {
  if (!rawNode || typeof rawNode !== "object") {
    return null;
  }

  const normalizedMove = normalizeStoredMove(rawNode.move);
  const side =
    rawNode.side === "white" || rawNode.side === "black" ? rawNode.side : null;

  if (nodeId !== ROOT_VARIANT_NODE_ID && !normalizedMove) {
    return null;
  }

  const children = Array.isArray(rawNode.children)
    ? rawNode.children.filter((childId) => typeof childId === "string" && childId in nodes)
    : [];

  return {
    id: nodeId,
    parentId,
    children,
    move: normalizedMove,
    san: typeof rawNode.san === "string" && rawNode.san.trim() ? rawNode.san : null,
    fen: typeof rawNode.fen === "string" && rawNode.fen.trim() ? rawNode.fen : null,
    ply: Number.isInteger(rawNode.ply) && rawNode.ply >= 0 ? rawNode.ply : 0,
    moveNumber:
      Number.isInteger(rawNode.moveNumber) && rawNode.moveNumber >= 0
        ? rawNode.moveNumber
        : 0,
    side,
  };
}

function getDeepestMainlineNodeId(tree, startNodeId = tree.rootId) {
  let currentNodeId = tree.nodes[startNodeId] ? startNodeId : tree.rootId;

  while (tree.nodes[currentNodeId]?.children[0]) {
    currentNodeId = tree.nodes[currentNodeId].children[0];
  }

  return currentNodeId;
}

function getMainlineLeafId(tree) {
  return getDeepestMainlineNodeId(tree, tree.rootId);
}

function getLineNodeIdAtPly(tree, leafId, targetPly) {
  const pathNodeIds = findNodePathIds(tree, leafId);
  const normalizedPly = Math.max(0, targetPly);
  const targetIndex = Math.min(normalizedPly, pathNodeIds.length - 1);

  return pathNodeIds[targetIndex] ?? tree.rootId;
}

function getClosestMainlineNodeId(tree, targetNodeId) {
  const mainlineLeafId = getMainlineLeafId(tree);
  const targetPly = tree.nodes[targetNodeId]?.ply ?? 0;

  return getLineNodeIdAtPly(tree, mainlineLeafId, targetPly);
}

function getVariationStartNodeId(tree, leafId) {
  return (
    getFirstDivergenceNodeId(tree, leafId) ??
    getFirstMoveNodeIdForLine(tree, leafId) ??
    tree.rootId
  );
}

function finalizeVariantTree(tree, { preserveRememberedMainline = false } = {}) {
  const mainlineLeafId = getMainlineLeafId(tree);
  const rememberedSourceId =
    preserveRememberedMainline || tree.activeLineLeafId !== mainlineLeafId
      ? tree.rememberedMainlineNodeId
      : tree.currentNodeId;

  return {
    ...tree,
    rememberedMainlineNodeId: getClosestMainlineNodeId(
      tree,
      rememberedSourceId ?? tree.rootId,
    ),
  };
}

function findLeafNodeIds(tree) {
  return collectLeafNodeIdsFromNode(tree, tree.rootId);
}

function collectLeafNodeIdsFromNode(tree, startNodeId) {
  const leafNodeIds = [];

  function visit(nodeId) {
    const node = tree.nodes[nodeId];

    if (!node) {
      return;
    }

    if (node.children.length === 0) {
      if (nodeId !== tree.rootId) {
        leafNodeIds.push(nodeId);
      }

      return;
    }

    node.children.forEach(visit);
  }

  visit(startNodeId);

  return leafNodeIds;
}

function getFirstMoveNodeIdForLine(tree, leafId) {
  const pathNodeIds = findNodePathIds(tree, leafId);
  return pathNodeIds[1] ?? null;
}

function getFirstDivergenceNodeId(tree, leafId) {
  const pathNodeIds = findNodePathIds(tree, leafId);

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const nodeId = pathNodeIds[index];
    const parentId = pathNodeIds[index - 1];
    const parentNode = tree.nodes[parentId];

    if (parentNode?.children[0] !== nodeId) {
      return nodeId;
    }
  }

  return null;
}

function getDemotableNodeId(tree, leafId) {
  const pathNodeIds = findNodePathIds(tree, leafId);

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const nodeId = pathNodeIds[index];
    const parentId = pathNodeIds[index - 1];
    const parentNode = tree.nodes[parentId];

    if (parentNode?.children.length > 1 && parentNode.children[0] === nodeId) {
      return nodeId;
    }
  }

  return null;
}

function normalizeVariantTreeFromRaw(rawTree) {
  if (!rawTree || typeof rawTree !== "object") {
    return createBaseVariantTree();
  }

  const initialFen = isValidFen(rawTree.initialFen) ? rawTree.initialFen : DEFAULT_POSITION;
  const rawNodes =
    rawTree.nodes && typeof rawTree.nodes === "object" ? rawTree.nodes : {};
  const rootId =
    typeof rawTree.rootId === "string" && rawTree.rootId in rawNodes
      ? rawTree.rootId
      : ROOT_VARIANT_NODE_ID;
  const normalizedNodes = {};

  normalizedNodes[rootId] =
    sanitizeNode(rawNodes[rootId], rootId, rawNodes, null) ?? createRootNode(initialFen);
  normalizedNodes[rootId].move = null;
  normalizedNodes[rootId].fen = initialFen;
  normalizedNodes[rootId].ply = 0;
  normalizedNodes[rootId].moveNumber = 0;
  normalizedNodes[rootId].side = null;

  const stack = [{ nodeId: rootId, parentId: null }];

  while (stack.length > 0) {
    const { nodeId, parentId } = stack.pop();
    const node = normalizedNodes[nodeId];

    if (!node) {
      continue;
    }

    node.parentId = parentId;
    node.children = node.children.filter((childId) => {
      if (childId in normalizedNodes) {
        return true;
      }

      const sanitizedChild = sanitizeNode(rawNodes[childId], childId, rawNodes, nodeId);

      if (!sanitizedChild) {
        return false;
      }

      normalizedNodes[childId] = sanitizedChild;
      stack.push({ nodeId: childId, parentId: nodeId });

      return true;
    });
  }

  const reachableNodeIds = collectReachableNodeIds(normalizedNodes, rootId);
  const nodes = Object.fromEntries(
    Object.entries(normalizedNodes).filter(([nodeId]) => reachableNodeIds.has(nodeId)),
  );
  const currentNodeId =
    typeof rawTree.currentNodeId === "string" && rawTree.currentNodeId in nodes
      ? rawTree.currentNodeId
      : rootId;
  const activeLineLeafId =
    typeof rawTree.activeLineLeafId === "string" && rawTree.activeLineLeafId in nodes
      ? rawTree.activeLineLeafId
      : getDeepestMainlineNodeId({ rootId, nodes }, rootId);
  const rememberedMainlineNodeId =
    typeof rawTree.rememberedMainlineNodeId === "string" &&
    rawTree.rememberedMainlineNodeId in nodes
      ? rawTree.rememberedMainlineNodeId
      : currentNodeId;

  return finalizeVariantTree(
    {
      version: VARIANT_TREE_VERSION,
      initialFen,
      rootId,
      currentNodeId,
      activeLineLeafId: isAncestorNode({ nodes }, rootId, activeLineLeafId)
        ? activeLineLeafId
        : getDeepestMainlineNodeId({ rootId, nodes }, rootId),
      nextNodeIndex:
        Number.isInteger(rawTree.nextNodeIndex) && rawTree.nextNodeIndex > 0
          ? rawTree.nextNodeIndex
          : Object.keys(nodes).length,
      rememberedMainlineNodeId,
      nodes,
    },
    { preserveRememberedMainline: true },
  );
}

export function createEmptyVariantTree(initialFen = DEFAULT_POSITION) {
  return createBaseVariantTree(initialFen);
}

export function normalizeVariantTree(rawTree) {
  return normalizeVariantTreeFromRaw(rawTree);
}

export function buildGameToNode(tree, targetNodeId = tree.currentNodeId) {
  const normalizedTree = normalizeVariantTree(tree);
  const game = createGameForFen(normalizedTree.initialFen);
  const pathNodeIds = findNodePathIds(normalizedTree, targetNodeId);

  pathNodeIds.slice(1).forEach((nodeId) => {
    const move = normalizedTree.nodes[nodeId]?.move;

    if (!move || !game.move(move)) {
      throw new Error(`Failed to replay move for node ${nodeId}`);
    }
  });

  return game;
}

export function getMoveHistoryForNode(tree, targetNodeId = tree.currentNodeId) {
  const normalizedTree = normalizeVariantTree(tree);

  return findNodePathIds(normalizedTree, targetNodeId)
    .slice(1)
    .map((nodeId) => normalizedTree.nodes[nodeId]?.san)
    .filter(Boolean);
}

export function canUndoInVariantTree(tree) {
  const normalizedTree = normalizeVariantTree(tree);
  return normalizedTree.currentNodeId !== normalizedTree.rootId;
}

export function getNextRedoNodeId(tree) {
  const normalizedTree = normalizeVariantTree(tree);
  const activePath = findNodePathIds(normalizedTree, normalizedTree.activeLineLeafId);
  const currentPathIndex = activePath.indexOf(normalizedTree.currentNodeId);

  if (currentPathIndex >= 0 && currentPathIndex < activePath.length - 1) {
    return activePath[currentPathIndex + 1];
  }

  return normalizedTree.nodes[normalizedTree.currentNodeId]?.children[0] ?? null;
}

export function canRedoInVariantTree(tree) {
  return !!getNextRedoNodeId(tree);
}

export function undoInVariantTree(tree) {
  const normalizedTree = normalizeVariantTree(tree);
  const parentId = normalizedTree.nodes[normalizedTree.currentNodeId]?.parentId;

  if (!parentId) {
    return normalizedTree;
  }

  return finalizeVariantTree({
    ...normalizedTree,
    currentNodeId: parentId,
  });
}

export function redoInVariantTree(tree) {
  const normalizedTree = normalizeVariantTree(tree);
  const nextRedoNodeId = getNextRedoNodeId(normalizedTree);

  if (!nextRedoNodeId) {
    return normalizedTree;
  }

  return finalizeVariantTree({
    ...normalizedTree,
    currentNodeId: nextRedoNodeId,
  });
}

export function goToStartInVariantTree(tree) {
  const normalizedTree = normalizeVariantTree(tree);

  return finalizeVariantTree({
    ...normalizedTree,
    currentNodeId: normalizedTree.rootId,
  });
}

export function goToEndInVariantTree(tree) {
  const normalizedTree = normalizeVariantTree(tree);

  return finalizeVariantTree({
    ...normalizedTree,
    currentNodeId: normalizedTree.activeLineLeafId,
  });
}

export function selectVariantLine(tree, leafId) {
  const normalizedTree = normalizeVariantTree(tree);
  const mainlineLeafId = getMainlineLeafId(normalizedTree);
  const normalizedLeafId =
    leafId in normalizedTree.nodes
      ? getDeepestMainlineNodeId(normalizedTree, leafId)
      : normalizedTree.activeLineLeafId;
  const nextCurrentNodeId =
    normalizedLeafId === mainlineLeafId
      ? normalizedTree.rememberedMainlineNodeId
      : getVariationStartNodeId(normalizedTree, normalizedLeafId);

  return finalizeVariantTree({
    ...normalizedTree,
    currentNodeId: nextCurrentNodeId,
    activeLineLeafId: normalizedLeafId,
  });
}

export function applyMoveToVariantTree(tree, move) {
  const normalizedTree = normalizeVariantTree(tree);
  const game = buildGameToNode(normalizedTree);
  const appliedMove = game.move(move);

  if (!appliedMove) {
    return null;
  }

  const normalizedMove = normalizeStoredMove(appliedMove);
  const currentNode = normalizedTree.nodes[normalizedTree.currentNodeId];
  const matchingChildId = currentNode.children.find((childId) => {
    const childMove = normalizedTree.nodes[childId]?.move;

    return (
      childMove?.from === normalizedMove.from &&
      childMove?.to === normalizedMove.to &&
      childMove?.promotion === normalizedMove.promotion
    );
  });

  if (matchingChildId) {
    return finalizeVariantTree({
      ...normalizedTree,
      currentNodeId: matchingChildId,
      activeLineLeafId: getDeepestMainlineNodeId(normalizedTree, matchingChildId),
    });
  }

  const nextTree = {
    ...normalizedTree,
    nodes: cloneNodes(normalizedTree.nodes),
  };
  const nextCurrentNode = nextTree.nodes[nextTree.currentNodeId];
  const nextNodeId = `node-${nextTree.nextNodeIndex}`;
  nextTree.nextNodeIndex += 1;
  nextTree.nodes[nextNodeId] = createNodeFromMove(
    nextNodeId,
    nextCurrentNode,
    appliedMove,
    game.fen(),
  );
  nextCurrentNode.children = [...nextCurrentNode.children, nextNodeId];
  nextTree.currentNodeId = nextNodeId;
  nextTree.activeLineLeafId = nextNodeId;

  return finalizeVariantTree(nextTree);
}

export function promoteVariantLine(tree, leafId) {
  const normalizedTree = normalizeVariantTree(tree);
  const pathNodeIds = findNodePathIds(normalizedTree, leafId);
  const nextTree = {
    ...normalizedTree,
    nodes: cloneNodes(normalizedTree.nodes),
  };
  let didPromote = false;

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const childId = pathNodeIds[index];
    const parentId = pathNodeIds[index - 1];
    const parentNode = nextTree.nodes[parentId];

    if (parentNode.children[0] !== childId) {
      reorderChildren(parentNode, childId, 0);
      didPromote = true;
    }
  }

  return didPromote
    ? finalizeVariantTree(nextTree, { preserveRememberedMainline: true })
    : normalizedTree;
}

export function demoteVariantLine(tree, leafId) {
  const normalizedTree = normalizeVariantTree(tree);
  const pathNodeIds = findNodePathIds(normalizedTree, leafId);

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const childId = pathNodeIds[index];
    const parentId = pathNodeIds[index - 1];
    const parentNode = normalizedTree.nodes[parentId];

    if (parentNode.children.length > 1 && parentNode.children[0] === childId) {
      const nextTree = {
        ...normalizedTree,
        nodes: cloneNodes(normalizedTree.nodes),
      };

      reorderChildren(
        nextTree.nodes[parentId],
        childId,
        nextTree.nodes[parentId].children.length - 1,
      );

      return finalizeVariantTree(nextTree, { preserveRememberedMainline: true });
    }
  }

  return normalizedTree;
}

export function getVariantLines(tree) {
  const normalizedTree = normalizeVariantTree(tree);
  const leafNodeIds = findLeafNodeIds(normalizedTree);
  const currentPathIds = new Set(findNodePathIds(normalizedTree, normalizedTree.currentNodeId));

  return leafNodeIds.map((leafId) => {
    const pathNodeIds = findNodePathIds(normalizedTree, leafId);
    const pathNodes = pathNodeIds.slice(1).map((nodeId) => normalizedTree.nodes[nodeId]);
    const firstDivergenceNodeId = getFirstDivergenceNodeId(normalizedTree, leafId);
    const firstDivergenceNode = firstDivergenceNodeId
      ? normalizedTree.nodes[firstDivergenceNodeId]
      : null;
    const firstMoveNodeId = getFirstMoveNodeIdForLine(normalizedTree, leafId);

    return {
      id: leafId,
      leafId,
      moveCount: pathNodes.length,
      moves: pathNodes.map((node) => node.san).filter(Boolean),
      displayText: pathNodes.map((node) => node.san).filter(Boolean).join(" "),
      isMainLine: !firstDivergenceNodeId,
      isSelected: normalizedTree.activeLineLeafId === leafId,
      includesCurrentNode: currentPathIds.has(leafId) || isAncestorNode(normalizedTree, leafId, normalizedTree.currentNodeId),
      canPromote: !!firstDivergenceNodeId,
      canDemote: !!getDemotableNodeId(normalizedTree, leafId),
      firstMoveLabel: firstMoveNodeId ? normalizedTree.nodes[firstMoveNodeId].san : null,
      branchLabel: firstDivergenceNode
        ? `${firstDivergenceNode.moveNumber}${firstDivergenceNode.side === "black" ? "..." : "."} ${firstDivergenceNode.san}`
        : "Main line",
      lastMoveLabel: pathNodes[pathNodes.length - 1]?.san ?? null,
    };
  });
}

export function getRelevantVariantLines(tree) {
  const normalizedTree = normalizeVariantTree(tree);
  const currentNode = normalizedTree.nodes[normalizedTree.currentNodeId];

  if (!currentNode || currentNode.children.length <= 1) {
    return [];
  }

  const leafNodeIds = currentNode.children.flatMap((childId) =>
    collectLeafNodeIdsFromNode(normalizedTree, childId),
  );

  return getVariantLines(normalizedTree).filter((line) => leafNodeIds.includes(line.id));
}

export function getAlternativeVariantFirstMoves(tree) {
  const normalizedTree = normalizeVariantTree(tree);
  const currentNode = normalizedTree.nodes[normalizedTree.currentNodeId];

  if (!currentNode || currentNode.children.length <= 1) {
    return [];
  }

  const activePathNodeIds = findNodePathIds(
    normalizedTree,
    normalizedTree.activeLineLeafId,
  );
  const currentPathIndex = activePathNodeIds.indexOf(normalizedTree.currentNodeId);
  const selectedChildId =
    currentPathIndex >= 0 ? activePathNodeIds[currentPathIndex + 1] ?? null : null;

  return currentNode.children
    .filter((childId) => childId !== selectedChildId)
    .map((childId) => normalizedTree.nodes[childId]?.move)
    .filter(Boolean);
}

export function createVariantTreeFromMoves(moves, { initialFen = DEFAULT_POSITION } = {}) {
  const tree = createBaseVariantTree(initialFen);
  let parentId = tree.rootId;

  moves.forEach((move) => {
    const nextNodeId = appendMoveNode(tree, parentId, move, { makeMain: true });

    if (!nextNodeId) {
      throw new Error("Invalid move sequence for variant tree");
    }

    parentId = nextNodeId;
  });

  tree.currentNodeId = parentId;
  tree.activeLineLeafId = parentId;

  return finalizeVariantTree(tree);
}

export function createVariantTreeFromGameAndRedo(game, redoMoves = []) {
  const tree = createVariantTreeFromMoves(game.history({ verbose: true }), {
    initialFen: getInitialFenFromGame(game),
  });
  let parentId = tree.currentNodeId;
  let activeLeafId = tree.currentNodeId;
  const redoReplay = buildGameToNode(tree, tree.currentNodeId);

  redoMoves.forEach((move) => {
    const appliedMove = redoReplay.move(move);

    if (!appliedMove) {
      return;
    }

    const nextNodeId = appendMoveNode(tree, parentId, appliedMove, { makeMain: true });

    if (!nextNodeId) {
      return;
    }

    parentId = nextNodeId;
    activeLeafId = nextNodeId;
  });

  tree.activeLineLeafId = activeLeafId;

  return finalizeVariantTree(tree);
}

export function createVariantTreeFromParsedPgn(parsedPgn) {
  const initialFen =
    parsedPgn?.headers?.SetUp === "1" && isValidFen(parsedPgn?.headers?.FEN)
      ? parsedPgn.headers.FEN
      : DEFAULT_POSITION;
  const tree = createBaseVariantTree(initialFen);

  function buildParsedBranch(parsedNode, parentId, game, { makeMain = false } = {}) {
    if (!parsedNode) {
      return null;
    }

    if (!parsedNode.move) {
      let deepestNodeId = parentId;

      parsedNode.variations.forEach((childNode, index) => {
        const nextNodeId = buildParsedBranch(
          childNode,
          parentId,
          clonePositionGame(game),
          { makeMain: makeMain && index === 0 },
        );

        if (nextNodeId) {
          deepestNodeId = nextNodeId;
        }
      });

      return deepestNodeId;
    }

    const nextNodeId = appendMoveNode(tree, parentId, parsedNode.move, { makeMain });

    if (!nextNodeId) {
      throw new Error(`Invalid move in PGN variation: ${parsedNode.move}`);
    }

    const nextGame = buildGameToNode(tree, nextNodeId);
    let deepestNodeId = nextNodeId;

    parsedNode.variations.forEach((childNode, index) => {
      const variationLeafId = buildParsedBranch(
        childNode,
        nextNodeId,
        clonePositionGame(nextGame),
        { makeMain: index === 0 },
      );

      if (index === 0 && variationLeafId) {
        deepestNodeId = variationLeafId;
      }
    });

    return deepestNodeId;
  }

  let mainlineLeafId = tree.rootId;

  (parsedPgn?.root?.variations ?? []).forEach((variationNode, index) => {
    const variationLeafId = buildParsedBranch(
      variationNode,
      tree.rootId,
      createGameForFen(initialFen),
      { makeMain: index === 0 },
    );

    if (index === 0 && variationLeafId) {
      mainlineLeafId = variationLeafId;
    }
  });

  tree.currentNodeId = mainlineLeafId;
  tree.activeLineLeafId = mainlineLeafId;

  return finalizeVariantTree(tree);
}
