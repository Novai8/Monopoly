/**
 * Diagnostic logger for the board game state machine.
 * Formats: [TAG] Details
 * Tags: [TURN], [ROLL], [MOVE], [LAND], [ACTION], [CARD], [CARD_RESOLVE], [AUCTION], [AUCTION_BID], [AUCTION_END], [JAIL], [BUY], [TRADE], [ERROR]
 */

export const devLog = {
  turn: (playerName: string, msg: string) => {
    console.log(`%c[TURN] ${playerName}: ${msg}`, 'color: #38bdf8; font-weight: bold;');
  },
  roll: (playerName: string, d1: number, d2: number, total: number, isDoubles: boolean) => {
    console.log(
      `%c[ROLL] ${playerName} rolled ${d1} + ${d2} = ${total}${isDoubles ? ' (DOUBLES!)' : ''}`,
      'color: #f59e0b; font-weight: bold;'
    );
  },
  land: (playerName: string, tileName: string, tileType: string, cost?: number) => {
    console.log(
      `%c[LAND] ${playerName} landed on ${tileName} (${tileType}${cost ? `, $${cost}` : ''})`,
      'color: #10b981; font-weight: bold;'
    );
  },
  action: (playerName: string, actionDesc: string) => {
    console.log(`%c[ACTION] ${playerName}: ${actionDesc}`, 'color: #ec4899; font-weight: bold;');
  },
  card: (playerName: string, deck: string, title: string, desc: string) => {
    console.log(
      `%c[CARD] ${playerName} drew [${deck.toUpperCase()}] "${title}": ${desc}`,
      'color: #a855f7; font-weight: bold;'
    );
  },
  cardResolve: (playerName: string, title: string, outcome: string) => {
    console.log(
      `%c[CARD_RESOLVE] ${playerName} resolved "${title}" -> ${outcome}`,
      'color: #c084fc; font-weight: bold;'
    );
  },
  auction: (msg: string) => {
    console.log(`%c[AUCTION] ${msg}`, 'color: #f97316; font-weight: bold;');
  },
  auctionBid: (playerName: string, amount: number) => {
    console.log(`%c[AUCTION_BID] ${playerName} bid $${amount}`, 'color: #fb923c; font-weight: bold;');
  },
  auctionEnd: (tileName: string, winnerName: string | null, amount: number) => {
    console.log(
      `%c[AUCTION_END] ${tileName} sold to ${winnerName || 'Nobody'} for $${amount}`,
      'color: #f59e0b; font-weight: bold;'
    );
  },
  jail: (playerName: string, action: string) => {
    console.log(`%c[JAIL] ${playerName}: ${action}`, 'color: #ef4444; font-weight: bold;');
  },
  info: (tag: string, msg: string) => {
    console.log(`%c[${tag}] ${msg}`, 'color: #94a3b8;');
  },
  error: (tag: string, err: any) => {
    console.error(`[ERROR:${tag}]`, err);
  },
};
