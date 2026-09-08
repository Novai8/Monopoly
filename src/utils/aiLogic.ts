import { BoardTile, BotDifficulty, BotPersonality, OwnershipMap, Player, TradeOffer } from '../types';
import { getOwnedCountInGroup, ownsFullGroup } from './gameHelpers';

const PERSONALITY_WEIGHTS: Record<BotPersonality, { reserve: number; group: number; rent: number; development: number; blocking: number }> = {
  conservative: { reserve: 1.28, group: 0.95, rent: 0.9, development: 0.9, blocking: 0.7 },
  aggressive: { reserve: 0.78, group: 1.18, rent: 1.12, development: 1.08, blocking: 1.12 },
  collector: { reserve: 0.95, group: 1.45, rent: 1.0, development: 0.95, blocking: 1.28 },
  investor: { reserve: 1.0, group: 1.0, rent: 1.08, development: 1.35, blocking: 0.92 },
  opportunist: { reserve: 0.9, group: 1.12, rent: 1.1, development: 1.0, blocking: 1.35 },
  balanced: { reserve: 1.0, group: 1.05, rent: 1.02, development: 1.05, blocking: 1.0 },
};

function personalityOf(player: Player): BotPersonality { return player.personality || 'balanced'; }
function difficultyMultiplier(difficulty: BotDifficulty): number { return { easy: 0.84, normal: 1, hard: 1.08, expert: 1.14 }[difficulty]; }

function expectedRentValue(tile: BoardTile): number {
  if (tile.type === 'station') return 85;
  if (tile.type === 'utility') return 65;
  return tile.rent?.length ? Math.max(tile.rent[0] || 0, tile.rent[1] || 0) * 0.75 : 0;
}

function developmentValue(tile: BoardTile): number {
  if (!tile.houseCost || !tile.rent?.length) return 0;
  const improved = tile.rent[Math.min(2, tile.rent.length - 1)] || tile.rent[0] || 0;
  return Math.min(tile.cost || 0, improved * 0.65 + Math.max(0, 100 - tile.houseCost * 0.08));
}

function groupProgress(tile: BoardTile, player: Player, tiles: BoardTile[], ownership: OwnershipMap): { progress: number; completes: boolean } {
  if (!tile.group) return { progress: 0, completes: false };
  const groupTiles = tiles.filter((candidate) => candidate.group === tile.group);
  const owned = getOwnedCountInGroup(tile.group, player.id, tiles, ownership);
  return { progress: owned / Math.max(1, groupTiles.length), completes: owned === groupTiles.length - 1 };
}

export function getAISafeCashReserve(player: Player, tiles: BoardTile[], ownership: OwnershipMap): number {
  const personality = PERSONALITY_WEIGHTS[personalityOf(player)];
  const base = player.difficulty === 'easy' ? 100 : player.difficulty === 'hard' ? 190 : player.difficulty === 'expert' ? 240 : 145;
  const monopolyCount = tiles.filter((tile) => tile.group && ownsFullGroup(tile.group, player.id, tiles, ownership)).length;
  return Math.round(base * personality.reserve + monopolyCount * 30);
}

export function calculatePropertyValue(player: Player, tile: BoardTile, tiles: BoardTile[], ownership: OwnershipMap, players: Player[] = []): number {
  if (!tile.cost || !['property', 'station', 'utility'].includes(tile.type)) return 0;
  const personality = PERSONALITY_WEIGHTS[personalityOf(player)];
  const group = groupProgress(tile, player, tiles, ownership);
  const blocking = tiles.some((candidate) => candidate.group === tile.group && ownership[candidate.id]?.ownerId && ownership[candidate.id]?.ownerId !== player.id) ? tile.cost * 0.12 : 0;
  const opponentExposure = players.filter((candidate) => candidate.id !== player.id && !candidate.bankrupt).reduce((sum, opponent) => sum + tiles.filter((candidateTile) => ownership[candidateTile.id]?.ownerId === opponent.id).reduce((inner, ownedTile) => inner + expectedRentValue(ownedTile), 0) * 0.015, 0);
  return Math.round((tile.cost + group.progress * tile.cost * 0.35 * personality.group + expectedRentValue(tile) * personality.rent + developmentValue(tile) * personality.development + blocking * personality.blocking + opponentExposure) * difficultyMultiplier(player.difficulty || 'normal'));
}

export function calculateAuctionMaximumBid(player: Player, tile: BoardTile, tiles: BoardTile[], ownership: OwnershipMap, players: Player[] = []): number {
  if (!tile.cost || player.bankrupt || !['property', 'station', 'utility'].includes(tile.type)) return 0;
  const personality = PERSONALITY_WEIGHTS[personalityOf(player)];
  const group = groupProgress(tile, player, tiles, ownership);
  const reserve = getAISafeCashReserve(player, tiles, ownership);
  const expectedRent = expectedRentValue(tile);
  const development = developmentValue(tile);
  const blocking = tiles.some((candidate) => candidate.group === tile.group && ownership[candidate.id]?.ownerId && ownership[candidate.id]?.ownerId !== player.id) ? tile.cost * 0.12 : 0;
  const completionBonus = group.completes ? tile.cost * 0.42 * personality.group : group.progress * tile.cost * 0.16 * personality.group;
  const rentBonus = Math.min(tile.cost * 0.28, expectedRent * 1.1 * personality.rent);
  const developmentBonus = Math.min(tile.cost * 0.22, development * 0.55 * personality.development);
  const blockingBonus = Math.min(tile.cost * 0.16, blocking * personality.blocking);
  const opportunityCost = tile.cost * 0.08;
  const strategicValue = tile.cost + completionBonus + rentBonus + developmentBonus + blockingBonus - opportunityCost;
  const difficulty = difficultyMultiplier(player.difficulty || 'normal');
  const personalityFactor = personality.group * 0.12 + personality.blocking * 0.04;
  const rawMaximum = strategicValue * (0.86 + difficulty * 0.12 + personalityFactor);
  const strategicCap = tile.cost * (1.18 + (group.completes ? 0.48 : group.progress * 0.18) + (development > 0 ? 0.12 : 0) + (blocking > 0 ? 0.08 : 0));
  const safeCash = Math.max(0, player.balance - reserve);
  return Math.max(0, Math.floor(Math.min(rawMaximum, strategicCap, safeCash)));
}

export function shouldAIBuyProperty(aiPlayer: Player, tile: BoardTile, tiles: BoardTile[], ownership: OwnershipMap, players: Player[] = []): boolean {
  if (!tile.cost || !['property', 'station', 'utility'].includes(tile.type) || aiPlayer.bankrupt) return false;
  const reserve = getAISafeCashReserve(aiPlayer, tiles, ownership);
  const value = calculatePropertyValue(aiPlayer, tile, tiles, ownership, players);
  const personality = PERSONALITY_WEIGHTS[personalityOf(aiPlayer)];
  const threshold = (aiPlayer.difficulty === 'easy' ? 1.0 : aiPlayer.difficulty === 'hard' ? 0.9 : aiPlayer.difficulty === 'expert' ? 0.86 : 0.94) / personality.rent;
  return aiPlayer.balance - tile.cost >= reserve && value >= tile.cost * threshold;
}

export function shouldAIBidOnAuction(aiPlayer: Player, tile: BoardTile, currentBid: number, tiles: BoardTile[], ownership: OwnershipMap, players: Player[] = []): { shouldBid: boolean; maxBid: number } {
  const maxBid = calculateAuctionMaximumBid(aiPlayer, tile, tiles, ownership, players);
  const nextBid = currentBid + 10;
  return { shouldBid: nextBid <= maxBid && aiPlayer.balance >= nextBid, maxBid };
}

export function findAIPropertiesToBuild(aiPlayer: Player, tiles: BoardTile[], ownership: OwnershipMap): number | null {
  const reserve = getAISafeCashReserve(aiPlayer, tiles, ownership);
  let best: { id: number; score: number } | null = null;
  for (const tile of tiles) {
    if (!tile.group || !tile.houseCost || !ownsFullGroup(tile.group, aiPlayer.id, tiles, ownership)) continue;
    const houses = ownership[tile.id]?.houses || 0;
    if (houses >= 5 || aiPlayer.balance < tile.houseCost + reserve) continue;
    const score = (expectedRentValue(tile) + developmentValue(tile)) / Math.max(1, tile.houseCost) + (5 - houses) * 0.15;
    if (!best || score > best.score) best = { id: tile.id, score };
  }
  return best?.id ?? null;
}

export function findAIPropertyToMortgage(aiPlayer: Player, requiredCash: number, tiles: BoardTile[], ownership: OwnershipMap): number | null {
  const candidates = tiles.filter((tile) => ownership[tile.id]?.ownerId === aiPlayer.id && !ownership[tile.id]?.isMortgaged && (ownership[tile.id]?.houses || 0) === 0);
  candidates.sort((a, b) => calculatePropertyValue(aiPlayer, a, tiles, ownership) - calculatePropertyValue(aiPlayer, b, tiles, ownership));
  let raised = 0;
  for (const tile of candidates) { raised += tile.mortgageValue || Math.round((tile.cost || 100) * 0.5); if (raised >= requiredCash) return tile.id; }
  return candidates[0]?.id ?? null;
}

export function evaluateAITrade(offer: TradeOffer, aiPlayer: Player, tiles: BoardTile[], ownership: OwnershipMap): { accept: boolean; reason: string } {
  let offered = offer.offeredMoney; let requested = offer.requestedMoney;
  for (const id of offer.offeredTileIds) { const tile = tiles.find((candidate) => candidate.id === id); if (tile) offered += calculatePropertyValue(aiPlayer, tile, tiles, ownership); }
  for (const id of offer.requestedTileIds) { const tile = tiles.find((candidate) => candidate.id === id); if (tile) requested += calculatePropertyValue(aiPlayer, tile, tiles, ownership); }
  const ratio = aiPlayer.difficulty === 'expert' ? 1.12 : aiPlayer.difficulty === 'hard' ? 1.04 : aiPlayer.difficulty === 'easy' ? 0.9 : 0.98;
  const reserve = getAISafeCashReserve(aiPlayer, tiles, ownership);
  return offered >= requested * ratio && aiPlayer.balance + offer.offeredMoney - offer.requestedMoney >= reserve ? { accept: true, reason: 'The deal improves my position without compromising my cash reserve.' } : { accept: false, reason: 'The deal does not justify the assets or cash I would give up.' };
}

export function chooseAITargetPlayer(aiPlayer: Player, players: Player[], _choiceType: 'swap' | 'pay'): Player | null {
  const opponents = players.filter((player) => player.id !== aiPlayer.id && !player.bankrupt);
  return opponents.length ? [...opponents].sort((a, b) => b.balance - a.balance)[0] : null;
}

export const shouldAIBidInAuction = shouldAIBidOnAuction;
export function calculateAIBid(aiPlayer: Player, tile: BoardTile, tiles: BoardTile[], ownership: OwnershipMap): number { return calculateAuctionMaximumBid(aiPlayer, tile, tiles, ownership); }
