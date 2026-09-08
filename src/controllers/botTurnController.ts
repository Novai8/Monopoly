import { BoardTile, OwnershipMap, Player, Card, AuctionState, GamePhase } from '../types';
import {
  shouldAIBuyProperty,
  shouldAIBidOnAuction,
  findAIPropertiesToBuild,
  chooseAITargetPlayer,
} from '../utils/aiLogic';
import { devLog } from '../utils/devLogger';

export interface BotControllerContext {
  activePlayer: Player;
  gamePhase: GamePhase;
  currentTile: BoardTile;
  tiles: BoardTile[];
  ownership: OwnershipMap;
  players: Player[];
  drawnCard: Card | null;
  pendingRent: { amount: number; recipient: Player } | null;
  pendingTax: number | null;
  canBuyProperty: boolean;
  auction: AuctionState | null;
  doublesCount: number;
  isRolling: boolean;
  canRoll: boolean;
  canEndTurn: boolean;
}

export interface BotControllerCallbacks {
  onRoll: () => void;
  onBuyProperty: () => void;
  onPassProperty: () => void;
  onPayDetentionBail: () => void;
  onUseFreePass: () => void;
  onDismissCard: (targetPlayerId?: string) => void;
  onPayRent: () => void;
  onPayTax: () => void;
  onPlaceAuctionBid: (amount: number) => void;
  onPassAuction: () => void;
  onEndTurn: () => void;
  onUpgradeProperty?: (tileId: number) => void;
}

export class BotTurnController {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private lastProcessedPhase: string = '';

  public clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isProcessing = false;
  }

  public evaluateAndStep(
    ctx: BotControllerContext,
    cb: BotControllerCallbacks
  ) {
    const { activePlayer, gamePhase, auction } = ctx;

    // Handle auction participation even if it's not the active player's turn!
    if (auction && auction.active) {
      this.handleAuctionStep(ctx, cb);
      return;
    }

    // Only process if it is actually a bot's turn
    if (!activePlayer.isAI && !activePlayer.isBot) {
      this.clearTimer();
      return;
    }

    if (this.isProcessing) return;

    // 1. Ready to Roll
    if (gamePhase === 'ready-to-roll' && !ctx.isRolling && ctx.canRoll) {
      this.isProcessing = true;
      devLog.turn(activePlayer.name, 'Preparing to roll dice...');

      this.timer = setTimeout(() => {
        this.isProcessing = false;

        // In detention check
        if (activePlayer.inDetention) {
          const passes = activePlayer.detentionPasses ?? activePlayer.freePasses ?? 0;
          if (passes > 0) {
            devLog.jail(activePlayer.name, 'Used a Detention Free Pass');
            cb.onUseFreePass();
            return;
          }
          if (activePlayer.balance >= 150 && activePlayer.detentionTurns >= 1) {
            devLog.jail(activePlayer.name, 'Paid $50 bail fee');
            cb.onPayDetentionBail();
            return;
          }
          devLog.jail(activePlayer.name, `Rolling for doubles (Attempt ${activePlayer.detentionTurns + 1}/3)`);
        }

        // Before rolling, check if bot wants to upgrade any properties
        const propToBuild = findAIPropertiesToBuild(activePlayer, ctx.tiles, ctx.ownership);
        if (propToBuild && cb.onUpgradeProperty) {
          devLog.action(activePlayer.name, `Upgrading property ${propToBuild}`);
          cb.onUpgradeProperty(propToBuild);
        }

        cb.onRoll();
      }, 1000);
      return;
    }

    // 2. Action Required (Landed on Property, Rent, or Tax)
    if (gamePhase === 'action-required') {
      this.isProcessing = true;

      this.timer = setTimeout(() => {
        this.isProcessing = false;

        // Pending Rent
        if (ctx.pendingRent) {
          devLog.action(
            activePlayer.name,
            `Paying $${ctx.pendingRent.amount} rent to ${ctx.pendingRent.recipient.name}`
          );
          cb.onPayRent();
          return;
        }

        // Pending Tax
        if (ctx.pendingTax) {
          devLog.action(activePlayer.name, `Paying $${ctx.pendingTax} tax`);
          cb.onPayTax();
          return;
        }

        // Can Buy Property
        if (ctx.canBuyProperty && ctx.currentTile) {
          const shouldBuy = shouldAIBuyProperty(
            activePlayer,
            ctx.currentTile,
            ctx.tiles,
            ctx.ownership
          );

          if (shouldBuy) {
            devLog.action(activePlayer.name, `Decided to BUY ${ctx.currentTile.name} for $${ctx.currentTile.cost}`);
            cb.onBuyProperty();
          } else {
            devLog.action(
              activePlayer.name,
              `Decided to PASS on ${ctx.currentTile.name} (Opening Town Auction)`
            );
            cb.onPassProperty();
          }
          return;
        }

        // Fallback safety exit
        devLog.action(activePlayer.name, 'Action-required resolved, advancing turn.');
        cb.onEndTurn();
      }, 1200);
      return;
    }

    // 3. Card Choice (Landed on Chance or Community Chest)
    if (gamePhase === 'card-choice') {
      this.isProcessing = true;
      const card = ctx.drawnCard;

      if (card) {
        devLog.card(activePlayer.name, card.deck, card.title, card.description);
      }

      // Allow 1.6s so the card is readable on screen, then resolve automatically
      this.timer = setTimeout(() => {
        this.isProcessing = false;
        let targetPlayerId: string | undefined;

        if (card?.requiresPlayerChoice) {
          const target = chooseAITargetPlayer(activePlayer, ctx.players, 'swap');
          targetPlayerId = target?.id;
        }

        devLog.cardResolve(activePlayer.name, card?.title || 'Card', 'Effect applied');
        cb.onDismissCard(targetPlayerId);
      }, 1600);
      return;
    }

    // 4. Turn End
    if (gamePhase === 'turn-end' && ctx.canEndTurn) {
      this.isProcessing = true;
      devLog.turn(activePlayer.name, 'Ending turn smoothly.');

      this.timer = setTimeout(() => {
        this.isProcessing = false;
        cb.onEndTurn();
      }, 900);
      return;
    }
  }

  /**
   * Safe asynchronous auction handling for bots
   */
  private handleAuctionStep(
    ctx: BotControllerContext,
    cb: BotControllerCallbacks
  ) {
    const { auction, tiles, ownership, players } = ctx;
    if (!auction || !auction.active || this.isProcessing) return;

    const tile = tiles.find((t) => t.id === auction.tileId);
    if (!tile) return;

    // Find any bot that is an eligible bidder and hasn't passed yet
    const passedIds = auction.passedPlayerIds || [];
    const activeBots = players.filter(
      (p) => (p.isAI || p.isBot) && !p.bankrupt && !passedIds.includes(p.id)
    );

    if (activeBots.length === 0) return;

    // If the leading bidder is already one of our bots, don't outbid itself immediately
    const leadingBot = activeBots.find((b) => b.id === auction.highestBidderId);
    const candidateBots = activeBots.filter((b) => b.id !== auction.highestBidderId);

    if (candidateBots.length === 0) {
      // All other bots have passed or are leading
      return;
    }

    const botToAct = candidateBots[0];
    this.isProcessing = true;

    this.timer = setTimeout(() => {
      this.isProcessing = false;

      // Re-check auction status
      if (!auction.active) return;

      const decision = shouldAIBidOnAuction(botToAct, tile, auction.currentBid, tiles, ownership);

      if (decision.shouldBid && botToAct.balance > auction.currentBid) {
        const newBid = auction.currentBid + 10;
        devLog.auctionBid(botToAct.name, newBid);
        cb.onPlaceAuctionBid(newBid);
      } else {
        devLog.auction(`Bot ${botToAct.name} passed on ${tile.name}`);
        cb.onPassAuction();
      }
    }, 1200);
  }
}

export const botTurnController = new BotTurnController();
