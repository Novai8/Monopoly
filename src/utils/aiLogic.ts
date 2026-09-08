import { BoardTile, BotDifficulty, OwnershipMap, Player, TradeOffer } from '../types';
import { getOwnedCountInGroup, ownsFullGroup } from './gameHelpers';

export function shouldAIBuyProperty(
  aiPlayer: Player,
  tile: BoardTile,
  tiles: BoardTile[],
  ownership: OwnershipMap
): boolean {
  if (!tile.cost) return false;
  const difficulty = aiPlayer.difficulty || 'normal';

  let reserve = 150;
  if (difficulty === 'easy') reserve = 50;
  if (difficulty === 'hard') reserve = 250;
  if (difficulty === 'expert') reserve = 350;

  // If completing a group monopoly, bots are willing to spend more
  if (tile.group) {
    const owned = getOwnedCountInGroup(tile.group, aiPlayer.id, tiles, ownership);
    const totalInGroup = tiles.filter((t) => t.group === tile.group).length;

    if (owned === totalInGroup - 1) {
      // One step away from monopoly
      return aiPlayer.balance >= tile.cost;
    }
  }

  // Easy bot buys almost everything if it can afford it
  if (difficulty === 'easy') {
    return aiPlayer.balance >= tile.cost + 30;
  }

  return aiPlayer.balance >= tile.cost + reserve;
}

export function shouldAIBidOnAuction(
  aiPlayer: Player,
  tile: BoardTile,
  currentBid: number,
  tiles: BoardTile[],
  ownership: OwnershipMap
): { shouldBid: boolean; maxBid: number } {
  if (!tile.cost) return { shouldBid: false, maxBid: 0 };
  const difficulty = aiPlayer.difficulty || 'normal';

  let valueMultiplier = 1.0;
  if (difficulty === 'easy') valueMultiplier = 0.85;
  if (difficulty === 'hard') valueMultiplier = 1.25;
  if (difficulty === 'expert') valueMultiplier = 1.45;

  // If property completes a monopoly for the bot
  if (tile.group) {
    const owned = getOwnedCountInGroup(tile.group, aiPlayer.id, tiles, ownership);
    const totalInGroup = tiles.filter((t) => t.group === tile.group).length;
    if (owned === totalInGroup - 1) {
      valueMultiplier *= 1.8;
    }
  }

  const maxBid = Math.min(
    aiPlayer.balance - 50,
    Math.round((tile.cost || 100) * valueMultiplier)
  );

  const nextBid = currentBid + 10;
  return {
    shouldBid: nextBid <= maxBid && aiPlayer.balance >= nextBid,
    maxBid,
  };
}

export function findAIPropertiesToBuild(
  aiPlayer: Player,
  tiles: BoardTile[],
  ownership: OwnershipMap
): number | null {
  const difficulty = aiPlayer.difficulty || 'normal';
  const cashBuffer = difficulty === 'expert' ? 300 : difficulty === 'hard' ? 200 : 100;

  // Find all groups owned completely by aiPlayer
  const uniqueGroups = Array.from(new Set(tiles.map((t) => t.group).filter(Boolean)));

  for (const group of uniqueGroups) {
    if (group && ownsFullGroup(group, aiPlayer.id, tiles, ownership)) {
      const groupTiles = tiles.filter((t) => t.group === group);
      const groupHouses = groupTiles.map((t) => ownership[t.id]?.houses || 0);
      const minHouses = Math.min(...groupHouses);

      if (minHouses < 5) {
        const candidate = groupTiles.find((t) => (ownership[t.id]?.houses || 0) === minHouses);
        if (candidate && candidate.houseCost) {
          if (aiPlayer.balance >= candidate.houseCost + cashBuffer) {
            return candidate.id;
          }
        }
      }
    }
  }
  return null;
}

export function findAIPropertyToMortgage(
  aiPlayer: Player,
  requiredCash: number,
  tiles: BoardTile[],
  ownership: OwnershipMap
): number | null {
  const ownedTiles = tiles.filter(
    (t) =>
      ownership[t.id]?.ownerId === aiPlayer.id &&
      !ownership[t.id]?.isMortgaged &&
      (ownership[t.id]?.houses || 0) === 0
  );

  if (ownedTiles.length === 0) return null;

  // Prioritize mortgaging properties that are not part of a completed group
  ownedTiles.sort((a, b) => {
    const aMonopoly = a.group ? ownsFullGroup(a.group, aiPlayer.id, tiles, ownership) : false;
    const bMonopoly = b.group ? ownsFullGroup(b.group, aiPlayer.id, tiles, ownership) : false;
    if (aMonopoly && !bMonopoly) return 1;
    if (!aMonopoly && bMonopoly) return -1;
    return (a.mortgageValue || 0) - (b.mortgageValue || 0);
  });

  return ownedTiles[0]?.id ?? null;
}

export function evaluateAITrade(
  offer: TradeOffer,
  aiPlayer: Player,
  tiles: BoardTile[],
  ownership: OwnershipMap
): { accept: boolean; reason: string } {
  const difficulty = aiPlayer.difficulty || 'normal';
  let offeredVal = offer.offeredMoney;
  let requestedVal = offer.requestedMoney;

  for (const id of offer.offeredTileIds) {
    const tile = tiles.find((t) => t.id === id);
    if (!tile) continue;
    let val = tile.cost || 100;
    if (tile.group) {
      const currentOwned = getOwnedCountInGroup(tile.group, aiPlayer.id, tiles, ownership);
      const total = tiles.filter((t) => t.group === tile.group).length;
      if (currentOwned === total - 1) {
        val *= 2.5; // Big incentive to complete monopoly!
      }
    }
    offeredVal += val;
  }

  for (const id of offer.requestedTileIds) {
    const tile = tiles.find((t) => t.id === id);
    if (!tile) continue;
    let val = tile.cost || 100;
    if (tile.group && ownsFullGroup(tile.group, aiPlayer.id, tiles, ownership)) {
      val *= difficulty === 'expert' ? 3.5 : 2.5; // Reluctant to break monopoly
    }
    requestedVal += val;
  }

  const threshold = difficulty === 'expert' ? 1.15 : difficulty === 'hard' ? 1.05 : 0.95;

  if (offeredVal >= requestedVal * threshold) {
    return { accept: true, reason: 'Deal looks fair and beneficial!' };
  } else {
    return { accept: false, reason: 'Value offered is insufficient for my assets.' };
  }
}

export function chooseAITargetPlayer(
  aiPlayer: Player,
  players: Player[],
  choiceType: 'swap' | 'pay'
): Player | null {
  const activeOpponents = players.filter((p) => p.id !== aiPlayer.id && !p.bankrupt);
  if (activeOpponents.length === 0) return null;

  if (choiceType === 'swap') {
    // Pick the player who is furthest ahead or closest to GO/monopolies
    activeOpponents.sort((a, b) => b.balance - a.balance);
    return activeOpponents[0] || null;
  }

  if (choiceType === 'pay') {
    // Pick the richest opponent
    activeOpponents.sort((a, b) => b.balance - a.balance);
    return activeOpponents[0] || null;
  }

  return activeOpponents[0] || null;
}

export const shouldAIBidInAuction = shouldAIBidOnAuction;

export function calculateAIBid(
  aiPlayer: Player,
  tile: BoardTile,
  tiles: BoardTile[],
  ownership: OwnershipMap
): number {
  const result = shouldAIBidOnAuction(aiPlayer, tile, 0, tiles, ownership);
  return result.maxBid;
}


