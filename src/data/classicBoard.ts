import { BoardSize, BoardTheme, BoardTile } from '../types';
import { generateBoard as generateBaseBoard } from './boardData';

const CLASSIC_PROPERTIES = [
  'Mediterranean Avenue',
  'Baltic Avenue',
  'Oriental Avenue',
  'Vermont Avenue',
  'Connecticut Avenue',
  'St. Charles Place',
  'States Avenue',
  'Virginia Avenue',
  'St. James Place',
  'Tennessee Avenue',
  'New York Avenue',
  'Kentucky Avenue',
  'Indiana Avenue',
  'Illinois Avenue',
  'Atlantic Avenue',
  'Ventnor Avenue',
  'Marvin Gardens',
  'Pacific Avenue',
  'North Carolina Avenue',
  'Pennsylvania Avenue',
  'Park Place',
  'Boardwalk',
] as const;

const CLASSIC_STATIONS = ['Reading Railroad', 'Pennsylvania Railroad', 'B&O Railroad', 'Short Line'];
const CLASSIC_UTILITIES = ['Electric Company', 'Water Works'];

export function generateClassicBoard(size: BoardSize, theme?: BoardTheme): BoardTile[] {
  const base = generateBaseBoard(size, theme);
  let propertyIndex = 0;
  let stationIndex = 0;
  let utilityIndex = 0;
  let taxIndex = 0;
  let eventIndex = 0;
  let communityIndex = 0;

  return base.map((tile) => {
    if (tile.type === 'property') {
      const name = CLASSIC_PROPERTIES[propertyIndex];
      propertyIndex += 1;
      return name ? { ...tile, name } : tile;
    }
    if (tile.type === 'station') {
      const name = CLASSIC_STATIONS[stationIndex] ?? tile.name;
      stationIndex += 1;
      return { ...tile, name };
    }
    if (tile.type === 'utility') {
      const name = CLASSIC_UTILITIES[utilityIndex] ?? tile.name;
      utilityIndex += 1;
      return { ...tile, name };
    }
    if (tile.type === 'event') {
      eventIndex += 1;
      return { ...tile, name: 'Chance' };
    }
    if (tile.type === 'community') {
      communityIndex += 1;
      return { ...tile, name: 'Community Chest' };
    }
    if (tile.type === 'tax') {
      const name = taxIndex === 0 ? 'Income Tax' : 'Luxury Tax';
      taxIndex += 1;
      return { ...tile, name };
    }
    if (tile.type === 'start') return { ...tile, name: 'GO / Town Square' };
    if (tile.type === 'detention') return { ...tile, name: 'Jail / Detention' };
    if (tile.type === 'rest') return { ...tile, name: 'Free Parking' };
    if (tile.type === 'go-to-detention') return { ...tile, name: 'Go To Jail' };
    return tile;
  });
}
