import {
  BoardTile,
  Card,
  GameMode,
  GameSettings,
  OwnershipMap,
  Player,
  TradeOffer,
  AuctionState,
  OpeningRollState,
  OpeningRollRecord,
} from '../types';
import { drawCard } from '../data/cardsData';
import { calculateRent, ownsFullGroup, getOwnedCountInGroup } from '../utils/gameHelpers';

export interface LandingResult {
  type: 'unowned' | 'rent' | 'tax' | 'card' | 'detention' | 'safe' | 'auction';
  amount?: number;
  recipientId?: string;
  card?: Card;
  description: string;
}

export class GameEngine {
  /**
   * Roll a pair of standard 6-sided dice (1-6)
   */
  public static rollDice(): [number, number] {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    return [d1, d2];
  }

  /**
   * Determine salary for passing GO based on game mode
   */
  public static getGoSalary(mode: GameMode = 'classic'): number {
    switch (mode) {
      case 'high-stakes':
        return 350;
      case 'quick':
        return 250;
      case 'chaos':
        return 200 + Math.floor(Math.random() * 100);
      case 'friendly':
        return 250;
      default:
        return 200;
    }
  }

  /**
   * Calculate space-by-space movement path and detect passing GO
   */
  public static calculateMovementPath(
    currentPos: number,
    spaces: number,
    totalTiles: number
  ): { targetPos: number; path: number[]; passedGo: boolean } {
    const path: number[] = [];
    let passedGo = false;
    let pos = currentPos;

    for (let i = 1; i <= spaces; i++) {
      pos = (pos + 1) % totalTiles;
      path.push(pos);
      if (pos === 0) {
        passedGo = true;
      }
    }

    return {
      targetPos: pos,
      path,
      passedGo,
    };
  }

  /**
   * Resolve player landing on a tile
   */
  public static resolveLanding(
    player: Player,
    tile: BoardTile,
    boardTiles: BoardTile[],
    ownership: OwnershipMap,
    allPlayers: Player[],
    settings: GameSettings,
    diceTotal: number
  ): LandingResult {
    // 1. Go To Detention Tile
    if (tile.type === 'go-to-detention') {
      return {
        type: 'detention',
        description: `${player.name} triggered the security alarm and was escorted to Detention!`,
      };
    }

    // 2. Event / Chance Card Tile
    if (tile.type === 'event' || tile.type === 'community') {
      const card = drawCard(tile.type, settings.mode);
      return {
        type: 'card',
        card,
        description: `${player.name} drew a ${tile.type === 'event' ? 'Lucky Event' : 'Town Council'} card: "${card.title}"`,
      };
    }

    // 3. Tax Tile
    if (tile.type === 'tax') {
      let taxAmount = tile.taxAmount || 100;
      if (settings.mode === 'high-stakes') taxAmount = Math.round(taxAmount * 1.5);
      if (settings.mode === 'friendly') taxAmount = Math.round(taxAmount * 0.5);

      return {
        type: 'tax',
        amount: taxAmount,
        description: `${player.name} must pay $${taxAmount} in Municipal Assessment Taxes.`,
      };
    }

    // 4. Safe resting tiles (Start, Detention visiting, Rest Tavern)
    if (tile.type === 'start' || tile.type === 'detention' || tile.type === 'rest') {
      return {
        type: 'safe',
        description: `${player.name} is resting safely at ${tile.name}.`,
      };
    }

    // 5. Purchasable Properties (Property, Station, Utility)
    const propRecord = ownership[tile.id];
    if (!propRecord || !propRecord.ownerId) {
      return {
        type: 'unowned',
        amount: tile.cost || 100,
        description: `${tile.name} is unowned! Price: $${tile.cost || 100}.`,
      };
    }

    // If already owned by current player
    if (propRecord.ownerId === player.id) {
      return {
        type: 'safe',
        description: `${player.name} visited their own estate at ${tile.name}.`,
      };
    }

    // If mortgaged, no rent is due
    if (propRecord.isMortgaged) {
      return {
        type: 'safe',
        description: `${tile.name} is currently mortgaged; no rent is owed.`,
      };
    }

    // Owned by an opponent: Calculate rent
    const owner = allPlayers.find((p) => p.id === propRecord.ownerId);
    if (!owner || owner.bankrupt) {
      return {
        type: 'safe',
        description: `Owner is no longer active; no rent due.`,
      };
    }

    let rent = calculateRent(tile, boardTiles, ownership, diceTotal);
    if (settings.mode === 'high-stakes') rent = Math.round(rent * 1.25);
    if (settings.mode === 'friendly') rent = Math.round(rent * 0.75);

    return {
      type: 'rent',
      amount: rent,
      recipientId: owner.id,
      description: `${player.name} landed on ${tile.name} and owes $${rent} rent to ${owner.name}.`,
    };
  }

  /**
   * Execute Card Action Effect
   */
  public static executeCard(
    card: Card,
    player: Player,
    allPlayers: Player[],
    boardTiles: BoardTile[],
    ownership: OwnershipMap,
    totalTiles: number
  ): {
    updatedPlayer: Player;
    updatedAllPlayers: Player[];
    updatedOwnership: OwnershipMap;
    message: string;
    targetPosition?: number;
  } {
    const updated = { ...player };
    let updatedPlayers = [...allPlayers];
    const updatedOwn = { ...ownership };
    let msg = card.description;
    let targetPos: number | undefined;

    switch (card.actionType) {
      case 'collect': {
        const val = card.value || 100;
        updated.balance += val;
        msg = `${player.name} collected $${val}.`;
        break;
      }

      case 'pay': {
        const val = card.value || 50;
        updated.balance -= val;
        msg = `${player.name} paid $${val}.`;
        break;
      }

      case 'free-pass': {
        updated.detentionPasses = (updated.detentionPasses || 0) + 1;
        msg = `${player.name} received a Detention Immunity Pass.`;
        break;
      }

      case 'go-detention': {
        updated.inDetention = true;
        updated.detentionTurns = 0;
        const detentionTile = boardTiles.find((t) => t.type === 'detention');
        if (detentionTile) {
          updated.position = detentionTile.id;
          targetPos = detentionTile.id;
        }
        msg = `${player.name} was sent directly to Jail!`;
        break;
      }

      case 'move-to': {
        if (card.targetTileId !== undefined) {
          targetPos = card.targetTileId;
          // Check if passed Go
          if (targetPos < updated.position && targetPos === 0) {
            updated.balance += 200;
          }
          updated.position = targetPos;
          const targetTile = boardTiles.find((t) => t.id === targetPos);
          msg = `${player.name} advanced directly to ${targetTile?.name || 'destination'}.`;
        }
        break;
      }

      case 'move-spaces': {
        const spaces = card.value || 3;
        targetPos = (updated.position + spaces + totalTiles) % totalTiles;
        updated.position = targetPos;
        const targetTile = boardTiles.find((t) => t.id === targetPos);
        msg = `${player.name} moved ${spaces > 0 ? 'forward' : 'backward'} ${Math.abs(spaces)} spaces to ${targetTile?.name}.`;
        break;
      }

      case 'repairs': {
        const houseFee = card.houseFee || 25;
        const hotelFee = card.hotelFee || 100;
        let totalCost = 0;
        Object.entries(updatedOwn).forEach(([_, prop]) => {
          if (prop.ownerId === player.id) {
            if (prop.houses === 5) totalCost += hotelFee;
            else if (prop.houses > 0) totalCost += prop.houses * houseFee;
          }
        });
        updated.balance -= totalCost;
        msg = `${player.name} paid $${totalCost} for property restorations and maintenance.`;
        break;
      }

      case 'collect-from-players': {
        const fee = card.value || 50;
        let collected = 0;
        updatedPlayers = updatedPlayers.map((p) => {
          if (p.id !== player.id && !p.bankrupt) {
            const deduct = Math.min(p.balance, fee);
            collected += deduct;
            return { ...p, balance: p.balance - deduct };
          }
          return p;
        });
        updated.balance += collected;
        msg = `${player.name} collected $${fee} from each other active player ($${collected} total).`;
        break;
      }

      case 'pay-players': {
        const fee = card.value || 50;
        const activeOpponents = updatedPlayers.filter((p) => p.id !== player.id && !p.bankrupt);
        const totalDue = fee * activeOpponents.length;
        updated.balance -= totalDue;
        updatedPlayers = updatedPlayers.map((p) => {
          if (p.id !== player.id && !p.bankrupt) {
            return { ...p, balance: p.balance + fee };
          }
          return p;
        });
        msg = `${player.name} paid $${fee} to each fellow player ($${totalDue} total).`;
        break;
      }

      case 'free-upgrade': {
        // Find first owned property with fewer than 5 houses
        const candidate = boardTiles.find(
          (t) => updatedOwn[t.id]?.ownerId === player.id && (updatedOwn[t.id]?.houses || 0) < 5
        );
        if (candidate) {
          updatedOwn[candidate.id] = {
            ...updatedOwn[candidate.id],
            houses: (updatedOwn[candidate.id]?.houses || 0) + 1,
          };
          msg = `${player.name} received a free architectural upgrade on ${candidate.name}!`;
        } else {
          updated.balance += 100;
          msg = `${player.name} received a $100 municipal grant in lieu of building upgrade.`;
        }
        break;
      }

      case 'player-choice-swap':
      case 'swap-positions': {
        const opponents = updatedPlayers.filter((p) => p.id !== player.id && !p.bankrupt);
        if (opponents.length > 0) {
          const targetOpponent = opponents[Math.floor(Math.random() * opponents.length)];
          const myOldPos = updated.position;
          const oppOldPos = targetOpponent.position;
          updated.position = oppOldPos;
          targetPos = oppOldPos;

          updatedPlayers = updatedPlayers.map((p) =>
            p.id === targetOpponent.id ? { ...p, position: myOldPos } : p
          );
          msg = `CHAOS EVENT! ${player.name} swapped positions on the board with ${targetOpponent.name}!`;
        }
        break;
      }

      case 'nearest-station': {
        const stations = boardTiles.filter((t) => t.type === 'station');
        if (stations.length > 0) {
          let nextStation = stations.find((s) => s.id > updated.position);
          if (!nextStation) {
            nextStation = stations[0];
          }
          if (nextStation.id < updated.position) {
            updated.balance += 200; // Passed GO!
          }
          updated.position = nextStation.id;
          targetPos = nextStation.id;
          msg = `${player.name} advanced to ${nextStation.name}.`;
        }
        break;
      }

      case 'nearest-utility': {
        const utilities = boardTiles.filter((t) => t.type === 'utility');
        if (utilities.length > 0) {
          let nextUtil = utilities.find((u) => u.id > updated.position);
          if (!nextUtil) {
            nextUtil = utilities[0];
          }
          if (nextUtil.id < updated.position) {
            updated.balance += 200; // Passed GO!
          }
          updated.position = nextUtil.id;
          targetPos = nextUtil.id;
          msg = `${player.name} advanced to ${nextUtil.name}.`;
        }
        break;
      }

      case 'player-choice-pay': {
        const opponents = updatedPlayers.filter((p) => p.id !== player.id && !p.bankrupt);
        if (opponents.length > 0) {
          const target = opponents[Math.floor(Math.random() * opponents.length)];
          const fee = card.value || 50;
          const deduct = Math.min(target.balance, fee);
          updated.balance += deduct;
          updatedPlayers = updatedPlayers.map((p) =>
            p.id === target.id ? { ...p, balance: p.balance - deduct } : p
          );
          msg = `${player.name} collected $${deduct} from ${target.name}.`;
        }
        break;
      }

      case 'rent-storm': {
        const val = card.value || 100;
        updated.balance += val;
        msg = `${player.name} collected a $${val} rental windfall!`;
        break;
      }

      default:
        break;
    }

    updatedPlayers = updatedPlayers.map((p) => (p.id === updated.id ? updated : p));

    return {
      updatedPlayer: updated,
      updatedAllPlayers: updatedPlayers,
      updatedOwnership: updatedOwn,
      message: msg,
      targetPosition: targetPos,
    };
  }

  /**
   * Atomic Property Purchase
   */
  public static buyProperty(
    player: Player,
    tile: BoardTile,
    ownership: OwnershipMap
  ): { success: boolean; updatedPlayer: Player; updatedOwnership: OwnershipMap; error?: string } {
    if (!tile.cost) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Property is not for sale.' };
    }
    if (ownership[tile.id]?.ownerId) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Property is already owned.' };
    }
    if (player.balance < tile.cost) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Insufficient balance to purchase.' };
    }

    const updatedPlayer: Player = {
      ...player,
      balance: player.balance - tile.cost,
    };

    const updatedOwnership: OwnershipMap = {
      ...ownership,
      [tile.id]: {
        ownerId: player.id,
        houses: 0,
        isMortgaged: false,
      },
    };

    return {
      success: true,
      updatedPlayer,
      updatedOwnership,
    };
  }

  /**
   * Atomic Property Upgrade (House / Hotel)
   */
  public static upgradeProperty(
    player: Player,
    tile: BoardTile,
    boardTiles: BoardTile[],
    ownership: OwnershipMap
  ): { success: boolean; updatedPlayer: Player; updatedOwnership: OwnershipMap; error?: string } {
    const prop = ownership[tile.id];
    if (!prop || prop.ownerId !== player.id) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'You do not own this property.' };
    }
    if (prop.isMortgaged) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Cannot upgrade mortgaged property.' };
    }
    if (prop.houses >= 5) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Maximum upgrades reached (Hotel).' };
    }
    if (!tile.houseCost || player.balance < tile.houseCost) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Insufficient funds for upgrade.' };
    }
    if (tile.group && !ownsFullGroup(tile.group, player.id, boardTiles, ownership)) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'You must own the entire color group to build.' };
    }

    // Even building rule check
    if (tile.group) {
      const groupTiles = boardTiles.filter((t) => t.group === tile.group);
      const minHouses = Math.min(...groupTiles.map((t) => ownership[t.id]?.houses || 0));
      if (prop.houses > minHouses) {
        return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Even building rule: upgrade other properties in the group first.' };
      }
    }

    const updatedPlayer: Player = {
      ...player,
      balance: player.balance - tile.houseCost,
    };

    const updatedOwnership: OwnershipMap = {
      ...ownership,
      [tile.id]: {
        ...prop,
        houses: prop.houses + 1,
      },
    };

    return {
      success: true,
      updatedPlayer,
      updatedOwnership,
    };
  }

  /**
   * Atomic Mortgage
   */
  public static mortgageProperty(
    player: Player,
    tile: BoardTile,
    boardTiles: BoardTile[],
    ownership: OwnershipMap
  ): { success: boolean; updatedPlayer: Player; updatedOwnership: OwnershipMap; error?: string } {
    const prop = ownership[tile.id];
    if (!prop || prop.ownerId !== player.id) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'You do not own this property.' };
    }
    if (prop.isMortgaged) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Property is already mortgaged.' };
    }
    // Check if any property in this group has houses
    if (tile.group) {
      const groupTiles = boardTiles.filter((t) => t.group === tile.group);
      const hasHouses = groupTiles.some((t) => (ownership[t.id]?.houses || 0) > 0);
      if (hasHouses) {
        return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Sell all buildings in the group before mortgaging.' };
      }
    }

    const val = tile.mortgageValue || Math.round((tile.cost || 100) * 0.5);

    return {
      success: true,
      updatedPlayer: { ...player, balance: player.balance + val },
      updatedOwnership: {
        ...ownership,
        [tile.id]: { ...prop, isMortgaged: true },
      },
    };
  }

  /**
   * Atomic Unmortgage
   */
  public static unmortgageProperty(
    player: Player,
    tile: BoardTile,
    ownership: OwnershipMap
  ): { success: boolean; updatedPlayer: Player; updatedOwnership: OwnershipMap; error?: string } {
    const prop = ownership[tile.id];
    if (!prop || prop.ownerId !== player.id) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'You do not own this property.' };
    }
    if (!prop.isMortgaged) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: 'Property is not mortgaged.' };
    }

    const baseVal = tile.mortgageValue || Math.round((tile.cost || 100) * 0.5);
    const unmortgageCost = Math.round(baseVal * 1.1); // 10% bank interest

    if (player.balance < unmortgageCost) {
      return { success: false, updatedPlayer: player, updatedOwnership: ownership, error: `Need $${unmortgageCost} to lift mortgage.` };
    }

    return {
      success: true,
      updatedPlayer: { ...player, balance: player.balance - unmortgageCost },
      updatedOwnership: {
        ...ownership,
        [tile.id]: { ...prop, isMortgaged: false },
      },
    };
  }

  /**
   * Atomic Trade Execution
   */
  public static executeTrade(
    trade: TradeOffer,
    allPlayers: Player[],
    ownership: OwnershipMap
  ): { success: boolean; updatedPlayers: Player[]; updatedOwnership: OwnershipMap; error?: string } {
    const fromPlayer = allPlayers.find((p) => p.id === trade.fromPlayerId);
    const toPlayer = allPlayers.find((p) => p.id === trade.toPlayerId);

    if (!fromPlayer || !toPlayer) {
      return { success: false, updatedPlayers: allPlayers, updatedOwnership: ownership, error: 'Invalid players.' };
    }
    if (fromPlayer.balance < trade.offeredMoney) {
      return { success: false, updatedPlayers: allPlayers, updatedOwnership: ownership, error: `${fromPlayer.name} has insufficient money.` };
    }
    if (toPlayer.balance < trade.requestedMoney) {
      return { success: false, updatedPlayers: allPlayers, updatedOwnership: ownership, error: `${toPlayer.name} has insufficient money.` };
    }

    // Verify ownership of offered properties
    for (const tId of trade.offeredTileIds) {
      if (ownership[tId]?.ownerId !== fromPlayer.id) {
        return { success: false, updatedPlayers: allPlayers, updatedOwnership: ownership, error: `${fromPlayer.name} does not own offered tile ${tId}.` };
      }
    }
    // Verify ownership of requested properties
    for (const tId of trade.requestedTileIds) {
      if (ownership[tId]?.ownerId !== toPlayer.id) {
        return { success: false, updatedPlayers: allPlayers, updatedOwnership: ownership, error: `${toPlayer.name} does not own requested tile ${tId}.` };
      }
    }

    const updatedOwn = { ...ownership };

    // Transfer offered properties to toPlayer
    for (const tId of trade.offeredTileIds) {
      updatedOwn[tId] = { ...updatedOwn[tId], ownerId: toPlayer.id };
    }
    // Transfer requested properties to fromPlayer
    for (const tId of trade.requestedTileIds) {
      updatedOwn[tId] = { ...updatedOwn[tId], ownerId: fromPlayer.id };
    }

    const updatedPlayers = allPlayers.map((p) => {
      if (p.id === fromPlayer.id) {
        return {
          ...p,
          balance: p.balance - trade.offeredMoney + trade.requestedMoney,
        };
      }
      if (p.id === toPlayer.id) {
        return {
          ...p,
          balance: p.balance - trade.requestedMoney + trade.offeredMoney,
        };
      }
      return p;
    });

    return {
      success: true,
      updatedPlayers,
      updatedOwnership: updatedOwn,
    };
  }

  /**
   * Atomic Auction Finalization
   */
  public static finalizeAuction(
    auction: AuctionState,
    allPlayers: Player[],
    ownership: OwnershipMap
  ): {
    winner: Player | null;
    updatedPlayers: Player[];
    updatedOwnership: OwnershipMap;
    message: string;
  } {
    if (!auction.highestBidderId || auction.currentBid <= 0) {
      return {
        winner: null,
        updatedPlayers: allPlayers,
        updatedOwnership: ownership,
        message: `Auction concluded with no qualifying bids. Property remains unowned.`,
      };
    }

    const winner = allPlayers.find((p) => p.id === auction.highestBidderId);
    if (!winner || winner.balance < auction.currentBid) {
      return {
        winner: null,
        updatedPlayers: allPlayers,
        updatedOwnership: ownership,
        message: `Highest bidder could not complete transaction.`,
      };
    }

    const updatedPlayers = allPlayers.map((p) =>
      p.id === winner.id ? { ...p, balance: p.balance - auction.currentBid } : p
    );

    const updatedOwnership: OwnershipMap = {
      ...ownership,
      [auction.tileId]: {
        ownerId: winner.id,
        houses: 0,
        isMortgaged: false,
      },
    };

    return {
      winner,
      updatedPlayers,
      updatedOwnership,
      message: `${winner.name} won the auction with a winning bid of $${auction.currentBid}!`,
    };
  }

  /**
   * Handle Bankruptcy
   */
  public static handleBankruptcy(
    bankruptPlayer: Player,
    creditorId: string | null,
    allPlayers: Player[],
    ownership: OwnershipMap
  ): {
    updatedPlayers: Player[];
    updatedOwnership: OwnershipMap;
    remainingActivePlayers: Player[];
    winner: Player | null;
    message: string;
  } {
    const updatedOwn = { ...ownership };
    const creditor = allPlayers.find((p) => p.id === creditorId);

    // If creditor is another player, transfer all bankrupt player's assets
    if (creditor) {
      Object.entries(updatedOwn).forEach(([idStr, prop]) => {
        if (prop.ownerId === bankruptPlayer.id) {
          updatedOwn[Number(idStr)] = {
            ...prop,
            ownerId: creditor.id,
          };
        }
      });
    } else {
      // Creditor is bank: release all properties to unowned, remove houses
      Object.entries(updatedOwn).forEach(([idStr, prop]) => {
        if (prop.ownerId === bankruptPlayer.id) {
          updatedOwn[Number(idStr)] = {
            ownerId: null,
            houses: 0,
            isMortgaged: false,
          };
        }
      });
    }

    const updatedPlayers = allPlayers.map((p) => {
      if (p.id === bankruptPlayer.id) {
        return { ...p, balance: 0, bankrupt: true };
      }
      if (creditor && p.id === creditor.id) {
        return { ...p, balance: p.balance + Math.max(0, bankruptPlayer.balance) };
      }
      return p;
    });

    const activePlayers = updatedPlayers.filter((p) => !p.bankrupt);
    const winner = activePlayers.length === 1 ? activePlayers[0] : null;

    const message = `${bankruptPlayer.name} has declared bankruptcy! ${
      creditor ? `Assets surrendered to ${creditor.name}.` : 'Properties returned to town deed registry.'
    }`;

    return {
      updatedPlayers,
      updatedOwnership: updatedOwn,
      remainingActivePlayers: activePlayers,
      winner,
      message,
    };
  }

  /**
   * Conduct Opening Roll for fairness
   * Highest roll wins first turn. Ties reroll.
   */
  public static conductOpeningRollStep(
    participants: Player[],
    currentRolls: Record<string, number> = {},
    tiedPlayerIds: string[] = []
  ): OpeningRollState {
    const toRoll =
      tiedPlayerIds.length > 0
        ? participants.filter((p) => tiedPlayerIds.includes(p.id))
        : participants;

    const rolls = { ...currentRolls };
    const history: OpeningRollRecord[] = [];

    toRoll.forEach((p) => {
      const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
      rolls[p.id] = roll;
      history.push({
        playerId: p.id,
        name: p.name,
        character: p.character,
        color: p.color,
        roll,
      });
    });

    // Find highest roll among toRoll
    let maxRoll = -1;
    toRoll.forEach((p) => {
      if (rolls[p.id] > maxRoll) {
        maxRoll = rolls[p.id];
      }
    });

    const highestPlayers = toRoll.filter((p) => rolls[p.id] === maxRoll);

    if (highestPlayers.length === 1) {
      return {
        active: true,
        rolls,
        tiedPlayerIds: [],
        winnerId: highestPlayers[0].id,
        history,
        isComplete: true,
      };
    } else {
      // Tie exists!
      return {
        active: true,
        rolls,
        tiedPlayerIds: highestPlayers.map((p) => p.id),
        winnerId: null,
        history,
        isComplete: false,
      };
    }
  }
}
