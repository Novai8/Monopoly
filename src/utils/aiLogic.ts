import { BoardTile, BotDifficulty, BotPersonality, OwnershipMap, Player, TradeOffer } from '../types';
import { getOwnedCountInGroup, ownsFullGroup } from './gameHelpers';

const PERSONALITY_WEIGHTS: Record<BotPersonality, { cashReserve: number; group: number; rent: number; development: number; blocking: number; risk: number }> = {
  conservative: { cashReserve: 1.28, group: 1.05, rent: 0.9, development: 0.95, blocking: 0.8, risk: 1.35 },
  aggressive: { cashReserve: 0.78, group: 1.2, rent: 1.18, development: 1.12, blocking: 1.15, risk: 0.72 },
  collector: { cashReserve: 0.95, group: 1.55, rent: 1.05, development: 0.95, blocking: 1.35, risk: 0.9 },
  investor: { cashReserve: 1.0, group: 1.05, rent: 1.12, development: 1.42, blocking: 0.95, risk: 0.92 },
  opportunist: { cashReserve: 0.9, group: 1.18, rent: 1.15, development: 1.05, blocking: 1.42, risk: 0.82 },
  balanced: { cashReserve: 1.0, group: 1.1, rent: 1.05, development: 1.08, blocking: 1.0, risk: 1.0 },
};

function personalityOf(player: Player): BotPersonality {
  return player.personality || 'balanced';
}

function difficultyMultiplier(difficulty: BotDifficulty): number {
  return { easy: 0.78, normal: 1, hard: 1.16, expert: 1.28 }[difficulty];
}

function groupProgressValue(player: Player, tile: BoardTile, tiles: BoardTile[], ownership: OwnershipMap): number {
  if (!tile.group) return 0;
  const groupTiles = tiles.filter((candidate) => candidate.group === tile.group);
  const owned = getOwnedCountInGroup(tile.group, player.id, tiles, ownership);
  const opponents = groupTiles.filter((candidate) => ownership[candidate.id]?.ownerId && ownership[candidate.id]?.ownerId !== player.id).length;
  const completion = owned === groupTiles.length - 1 ? 2.5 : owned / Math.max(1, groupTiles.length);
  const block = opponents > 0 ? 0.45 : 0;
  return (completion + block) * 100;
}

function expectedRentValue(tile: BoardTile): number {
  if (tile.type === 'station') return 85;
  if (tile.type === 'utility') return 65;
  if (!tile.rent?.length) return 0;
  return Math.max(tile.rent[0] || 0, tile.rent[1] || 0) * 0.75;
}

function developmentValue(tile: BoardTile): number {
  if (!tile.houseCost || !tile.rent?.length) return 0;
  const improved = tile.rent[Math.min(2, tile.rent.length - 1)] || tile.rent[0] || 0;
  return Math.min(180, improved * 0.7 + Math.max(0, 120 - tile.houseCost * 0.1));
}

function opponentExposure(player: Player, tiles: BoardTile[], ownership: OwnershipMap, players: Player[]): number {
  return players
    .filter((candidate) => candidate.id !== player.id && !candidate.bankrupt)
    .reduce((total, opponent) => {
      const owned = tiles.filter((tile) => ownership[tile.id]?.ownerId === opponent.id);
      return total + owned.reduce((sum, tile) => sum + expectedRentValue(tile), 0) * 0.03;
    }, 0);
}

export function calculatePropertyValue(
  player: Player,
  tile: BoardTile,
  tiles: BoardTile[],
  ownership: OwnershipMap,
  players: Player[] = []
): number {
  if (!tile.cost || !['property', 'station', 'utility'].includes(tile.type)) return 0;
  const personality = PERSONALITY_WEIGHTS[personalityOf(player)];
  const difficulty = difficultyMultiplier(player.difficulty || 'normal');
  const base = tile.cost;
  const group = groupProgressValue(player, tile, tiles, ownership) * personality.group;
  const rent = expectedRentValue(tile) * personality.rent;
  const development = developmentValue(tile) * personality.development;
  const blocking = groupProgressValue({ ...player, id: player.id }, tile, tiles, ownership) * personality.blocking * 0.35;
  const exposure = opponentExposure(player, tiles, ownership, players);
  return Math.round((base + group + rent + development + blocking + exposure) * difficulty);
}

export function getAISafeCashReserve(player: Player, tiles: BoardTile[], ownership: OwnershipMap): number {
  const personality = PERSONALITY_WEIGHTS[personalityOf(player)];
  const difficulty = player.difficulty || 'normal';
  const base = difficulty === 'easy' ? 80 : difficulty === 'normal' ? 140 : difficulty === 'hard' ? 220 : 300;
  const ownedGroups = tiles.filter((tile) => tile.group && ownsFullGroup(tile.group, player.id, tiles, ownership)).length;
  return Math.round(base * personality.cashReserve + ownedGroups * 35);
}

export function shouldAIBuyProperty(aiPlayer: Player, tile: BoardTile, tiles: BoardTile[], ownership: OwnershipMap, players: Player[] = []): boolean {
  if (!tile.cost || !['property', 'station', 'utility'].includes(tile.type) || aiPlayer.bankrupt) return false;
  const reserve = getAISafeCashReserve(aiPlayer, tiles, ownership);
  const value = calculatePropertyValue(aiPlayer, tile, tiles, ownership, players);
  const personality = PERSONALITY_WEIGHTS[personalityOf(aiPlayer)];
  const threshold = (aiPlayer.difficulty === 'easy' ? 0.98 : aiPlayer.difficulty === 'hard' ? 0.88 : aiPlayer.difficulty === 'expert' ? 0.82 : 0.92) / personality.risk;
  if (tile.group && ownsFullGroup(tile.group, aiPlayer.id, tiles, ownership)) return aiPlayer.balance >= tile.cost + Math.max(40, reserve * 0.55);
  return aiPlayer.balance - tile.cost >= reserve && value >= tile.cost * threshold;
}

export function shouldAIBidOnAuction(aiPlayer: Player, tile: BoardTile, currentBid: number, tiles: BoardTile[], ownership: OwnershipMap, players: Player[] = []): { shouldBid: boolean; maxBid: number } {
  if (!tile.cost || aiPlayer.bankrupt) return { shouldBid: false, maxBid: 0 };
  const difficulty = aiPlayer.difficulty || 'normal';
  const personality = PERSONALITY_WEIGHTS[personalityOf(aiPlayer)];
  const reserve = getAISafeCashReserve(aiPlayer, tiles, ownership);
  const value = calculatePropertyValue(aiPlayer, tile, tiles, ownership, players);
  const difficultyCap = difficulty === 'easy' ? 0.82 : difficulty === 'normal' ? 0.98 : difficulty === 'hard' ? 1.12 : 1.25;
  let maxBid = Math.min(aiPlayer.balance - Math.max(35, Math.round(reserve * personality.risk)), Math.round(value * difficultyCap));
  if (tile.group && getOwnedCountInGroup(tile.group, aiPlayer.id, tiles, ownership) === tiles.filter((candidate) => candidate.group === tile.group).length - 1) {
    maxBid = Math.min(aiPlayer.balance - Math.max(25, Math.round(reserve * 0.65)), Math.round(maxBid * (1.25 + personality.group * 0.18)));
  }
  maxBid = Math.max(0, maxBid);
  const nextBid = currentBid + 10;
  const deliberatePass = difficulty === 'easy' && nextBid > tile.cost * 0.95;
  const shouldBid = !deliberatePass && nextBid <= maxBid && aiPlayer.balance >= nextBid;
  return { shouldBid, maxBid };
}

export function findAIPropertiesToBuild(aiPlayer: Player, tiles: BoardTile[], ownership: OwnershipMap): number | null {
  const cashBuffer = getAISafeCashReserve(aiPlayer, tiles, ownership);
  let bestId: number | null = null;
  let bestScore = 0;
  for (const tile of tiles) {
    if (!tile.group || !tile.houseCost || !ownsFullGroup(tile.group, aiPlayer.id, tiles, ownership)) continue;
    const houses = ownership[tile.id]?.houses || 0;
    if (houses >= 5 || aiPlayer.balance < tile.houseCost + cashBuffer) continue;
    const score = (expectedRentValue(tile) + developmentValue(tile)) / Math.max(1, tile.houseCost) + (5 - houses) * 0.15;
    if (score > bestScore) { bestScore = score; bestId = tile.id; }
  }
  return bestId;
}

export function findAIPropertyToMortgage(aiPlayer: Player, requiredCash: number, tiles: BoardTile[], ownership: OwnershipMap): number | null {
  const candidates = tiles.filter((tile) => ownership[tile.id]?.ownerId === aiPlayer.id && !ownership[tile.id]?.isMortgaged && (ownership[tile.id]?.houses || 0) === 0);
  candidates.sort((a, b) => {
    const aMonopoly = a.group ? ownsFullGroup(a.group, aiPlayer.id, tiles, ownership) : false;
    const bMonopoly = b.group ? ownsFullGroup(b.group, aiPlayer.id, tiles, ownership) : false;
    if (aMonopoly !== bMonopoly) return aMonopoly ? 1 : -1;
    return calculatePropertyValue(aiPlayer, a, tiles, ownership) - calculatePropertyValue(aiPlayer, b, tiles, ownership);
  });
  let raised = 0;
  for (const tile of candidates) { raised += tile.mortgageValue || Math.round((tile.cost || 100) * 0.5); if (raised >= requiredCash) return tile.id; }
  return candidates[0]?.id ?? null;
}

export function evaluateAITrade(offer: TradeOffer, aiPlayer: Player, tiles: BoardTile[], ownership: OwnershipMap): { accept: boolean; reason: string } {
  let offeredVal = offer.offeredMoney;
  let requestedVal = offer.requestedMoney;
  for (const id of offer.offeredTileIds) {
    const tile = tiles.find((candidate) => candidate.id === id);
    if (tile) offeredVal += calculatePropertyValue(aiPlayer, tile, tiles, ownership);
  }
  for (const id of offer.requestedTileIds) {
    const tile = tiles.find((candidate) => candidate.id === id);
    if (tile) requestedVal += calculatePropertyValue(aiPlayer, tile, tiles, ownership);
  }
  const difficulty = aiPlayer.difficulty || 'normal';
  const ratio = difficulty === 'expert' ? 1.12 : difficulty === 'hard' ? 1.04 : difficulty === 'easy' ? 0.9 : 0.98;
  const reserve = getAISafeCashReserve(aiPlayer, tiles, ownership);
  const wouldRemainSafe = aiPlayer.balance + offer.offeredMoney - offer.requestedMoney >= reserve;
  return offeredVal >= requestedVal * ratio && wouldRemainSafe
    ? { accept: true, reason: 'The deal improves my position without compromising my cash reserve.' }
    : { accept: false, reason: 'The deal does not justify the assets or cash I would give up.' };
}

export function chooseAITargetPlayer(aiPlayer: Player, players: Player[], choiceType: 'swap' | 'pay'): Player | null {
  const opponents = players.filter((player) => player.id !== aiPlayer.id && !player.bankrupt);
  if (!opponents.length) return null;
  return [...opponents].sort((a, b) => choiceType === 'swap' ? b.balance - a.balance : b.balance - a.balance)[0] || null;
}

export const shouldAIBidInAuction = shouldAIBidOnAuction;

export function calculateAIBid(aiPlayer: Player, tile: BoardTile, tiles: BoardTile[], ownership: OwnershipMap): number {
  return shouldAIBidOnAuction(aiPlayer, tile, 0, tiles, ownership).maxBid;
}
