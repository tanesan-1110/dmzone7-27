import { CardData } from '../types/Card';
import { v4 as uuidv4 } from 'uuid';

const cardNames = [
  'トロン',
  'フォースアゲイン',
  'ヘブンズゲート',
  '青銅の鎧',
  '奇跡の精霊ミルザム',
  '我我我ガイアールブランド',
  'アストラルリーフ',
  '解体人形ジェニー',
  'サイバーブレイン',
  'ボルメテウス・ホワイト・ドラゴン'
];

export const getInitialDeck = (): CardData[] => {
  const deck: CardData[] = [];
  cardNames.forEach((name) => {
    for (let i = 0; i < 4; i++) {
      deck.push({
        id: uuidv4(),
        name,
        isFaceDown: false,
        isTapped: false
      });
    }
  });
  return deck;
};
