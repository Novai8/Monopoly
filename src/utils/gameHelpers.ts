import { BoardTile, OwnershipMap, Player, PropertyGroupColor } from '../types';

export function initializeOwnership(tiles: BoardTile[]): OwnershipMap {
  const map: OwnershipMap = {};
  tiles.forEach((tile) => {
    if (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') {
      map[tile.id] = {
        ownerId: null,
        houses: 0,
        isMortgaged: false,
      };
    }
  });
  return map;
}

export function ownsFullGroup(
  group: PropertyGroupColor,
  playerId: string,
  tiles: BoardTile[],
  ownership: OwnershipMap
): boolean {
  const groupTiles = tiles.filter((t) => t.group === group);
  if (groupTiles.length === 0) return false;
  return groupTiles.every((t) => ownership[t.id]?.ownerId === playerId);
}

export function getOwnedCountInGroup(
  group: PropertyGroupColor,
  playerId: string,
  tiles: BoardTile[],
  ownership: OwnershipMap
): number {
  return tiles.filter((t) => t.group === group && ownership[t.id]?.ownerId === playerId).length;
}

export function calculateRent(
  tile: BoardTile,
  tiles: BoardTile[],
  ownership: OwnershipMap,
  diceSum: number,
  isChaosRentMultiplier: boolean = false
): number {
  const prop = ownership[tile.id];
  if (!prop || !prop.ownerId || prop.isMortgaged) return 0;

  let baseRent = 0;

  if (tile.type === 'property') {
    if (!tile.rent) return 0;
    if (prop.houses > 0) {
      baseRent = tile.rent[prop.houses] || tile.rent[0];
    } else {
      // Unimproved property: check full group monopoly -> 2x base rent
      if (tile.group && ownsFullGroup(tile.group, prop.ownerId, tiles, ownership)) {
        baseRent = tile.rent[0] * 2;
      } else {
        baseRent = tile.rent[0];
      }
    }
  } else if (tile.type === 'station') {
    const ownerId = prop.ownerId;
    const stations = tiles.filter((t) => t.type === 'station');
    const ownedStations = stations.filter((t) => ownership[t.id]?.ownerId === ownerId).length;
    const stationRents = [25, 50, 100, 200, 300];
    baseRent = stationRents[Math.min(stationRents.length - 1, Math.max(0, ownedStations - 1))] || 25;
  } else if (tile.type === 'utility') {
    const ownerId = prop.ownerId;
    const utilities = tiles.filter((t) => t.type === 'utility');
    const ownedUtilities = utilities.filter((t) => ownership[t.id]?.ownerId === ownerId).length;
    const multiplier = ownedUtilities >= 2 ? 10 : 4;
    baseRent = diceSum * multiplier;
  }

  if (isChaosRentMultiplier) {
    baseRent = Math.round(baseRent * 1.5);
  }

  return baseRent;
}

export function calculateNetWorth(
  player: Player,
  tiles: BoardTile[],
  ownership: OwnershipMap
): number {
  let total = player.balance;
  Object.entries(ownership).forEach(([idStr, prop]) => {
    if (prop.ownerId === player.id) {
      const tile = tiles.find((t) => t.id === Number(idStr));
      if (tile) {
        if (!prop.isMortgaged && tile.cost) {
          total += tile.cost;
        } else if (tile.mortgageValue) {
          total += tile.mortgageValue;
        }
        if (tile.houseCost && prop.houses > 0) {
          total += prop.houses * tile.houseCost;
        }
      }
    }
  });
  return total;
}

export function getNearestStation(currentPos: number, tiles: BoardTile[]): number {
  const stationIds = tiles.filter((t) => t.type === 'station').map((t) => t.id);
  if (stationIds.length === 0) return 0;
  for (const id of stationIds) {
    if (id > currentPos) return id;
  }
  return stationIds[0];
}

export function getNearestUtility(currentPos: number, tiles: BoardTile[]): number {
  const utilIds = tiles.filter((t) => t.type === 'utility').map((t) => t.id);
  if (utilIds.length === 0) return 0;
  for (const id of utilIds) {
    if (id > currentPos) return id;
  }
  return utilIds[0];
}

export function getGridCoordinates(
  tileId: number,
  totalTiles: number
): {
  col: number;
  row: number;
  side: 'bottom' | 'left' | 'top' | 'right' | 'corner';
} {
  const sideLength = Math.floor(totalTiles / 4);

  // Bottom edge (tiles 0 .. sideLength)
  if (tileId === 0) return { col: sideLength, row: sideLength, side: 'corner' };
  if (tileId < sideLength) {
    return { col: sideLength - tileId, row: sideLength, side: 'bottom' };
  }

  // Left edge (tiles sideLength .. 2*sideLength)
  if (tileId === sideLength) return { col: 0, row: sideLength, side: 'corner' };
  if (tileId < sideLength * 2) {
    return { col: 0, row: sideLength * 2 - tileId, side: 'left' };
  }

  // Top edge (tiles 2*sideLength .. 3*sideLength)
  if (tileId === sideLength * 2) return { col: 0, row: 0, side: 'corner' };
  if (tileId < sideLength * 3) {
    return { col: tileId - sideLength * 2, row: 0, side: 'top' };
  }

  // Right edge (tiles 3*sideLength .. totalTiles)
  if (tileId === sideLength * 3) return { col: sideLength, row: 0, side: 'corner' };
  return { col: sideLength, row: tileId - sideLength * 3, side: 'right' };
}
