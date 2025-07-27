import React, { useState } from 'react';
import Zone from './Zone';
import { CardData, Player, PlayerZones, ZoneType } from '../types/Card';

const zoneColors = {
  hand: '#bfdbfe',
  mana: '#bbf7d0',
  shield: '#fef9c3',
  grave: '#ddd6fe',
  battle: '#fecaca',
  deck: '#e5e7eb',
};

const GameBoard = ({ players, setPlayers, currentPlayerId }) => {
  const [selectedCards, setSelectedCards] = useState({});

  const handleCardClick = (playerId, cardId) => {
    setSelectedCards(prev => {
      const arr = prev[playerId] || [];
      return { ...prev, [playerId]: arr.includes(cardId) ? arr.filter(id => id !== cardId) : [...arr, cardId] };
    });
  };

  const moveSelectedCards = (playerId, targetZone, faceDown = false, putOnBottom = false) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      const sel = selectedCards[playerId] || [];
      if (!sel.length) return player;
      const newZones = { ...player.zones };
      // どのゾーンにも属するカードは必ず1枚のみID一致で持つ
      Object.keys(newZones).forEach(zone => {
        newZones[zone] = newZones[zone].filter(c => !sel.includes(c.id));
      });
      // 移動カード
      const moved = [];
      Object.keys(player.zones).forEach(zone => {
        player.zones[zone].forEach(c => {
          if (sel.includes(c.id)) moved.push({ ...c, isFaceDown: faceDown });
        });
      });
      if (targetZone === 'deck' && putOnBottom) newZones.deck = [...newZones.deck, ...moved];
      else newZones[targetZone] = [...moved, ...newZones[targetZone]];
      return { ...player, zones: newZones };
    }));
    setSelectedCards(prev => ({ ...prev, [playerId]: [] }));
  };

  const moveTopDeckCardToZone = (playerId, targetZone) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      const newZones = { ...player.zones };
      if (!newZones.deck.length) return player;
      const top = newZones.deck[0];
      newZones.deck = newZones.deck.slice(1);
      newZones[targetZone] = [...newZones[targetZone], { ...top, isFaceDown: targetZone === 'shield' }];
      return { ...player, zones: newZones };
    }));
  };

  const drawCard = (playerId) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      const z = { ...player.zones };
      if (!z.deck.length) return player;
      const c = z.deck[0];
      z.deck = z.deck.slice(1);
      z.hand = [...z.hand, { ...c, isFaceDown: false }];
      return { ...player, zones: z };
    }));
  };

  const revealSelectedShield = (playerId) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      const sel = selectedCards[playerId] || [];
      const z = { ...player.zones };
      z.shield = z.shield.map(c => sel.includes(c.id) ? { ...c, isFaceDown: false } : c);
      return { ...player, zones: z };
    }));
  };

  // タップ切替（バトル・マナのみ対象、他ゾーンで選択しても何もしない）
  const toggleTappedState = (playerId) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      const sel = selectedCards[playerId] || [];
      if (!sel.length) return player;
      const z = { ...player.zones };
      ['battle', 'mana'].forEach(zone => {
        z[zone] = z[zone].map(c => sel.includes(c.id) ? { ...c, tapped: !c.tapped } : c);
      });
      return { ...player, zones: z };
    }));
    setSelectedCards(prev => ({ ...prev, [playerId]: [] }));
  };

  const self = players.find(p => p.id === currentPlayerId);
  const other = players.find(p => p.id !== currentPlayerId);

  return (
    <div className="p-2 bg-black text-white text-xs font-sans select-none" style={{ maxWidth: 1200, margin: 'auto' }}>
      {/* 相手ゾーン */}
      <Zone
        title={`相手の手札（${other.zones.hand.length}枚）`}
        cards={other.zones.hand.map(c => ({ ...c, isFaceDown: true }))}
        zone="hand"
        color={zoneColors.hand}
        selectedIds={selectedCards[other.id] || []}
        onSelect={id => handleCardClick(other.id, id)}
      />
      <Zone
        title={`相手のマナゾーン（${other.zones.mana.length}枚）`}
        cards={other.zones.mana}
        zone="mana"
        color={zoneColors.mana}
        selectedIds={selectedCards[other.id] || []}
        onSelect={id => handleCardClick(other.id, id)}
      />
      <div className="flex gap-2">
        <Zone
          title={`相手のシールドゾーン（${other.zones.shield.length}枚）`}
          cards={other.zones.shield.map(c => ({ ...c, isFaceDown: true }))}
          zone="shield"
          color={zoneColors.shield}
          selectedIds={selectedCards[other.id] || []}
          onSelect={id => handleCardClick(other.id, id)}
        />
        <Zone
          title={`相手の山札（${other.zones.deck.length}枚）`}
          cards={other.zones.deck}
          zone="deck"
          color={zoneColors.deck}
          selectedIds={[]}
          onDraw={() => moveTopDeckCardToZone(other.id, 'deck')}
        />
        <Zone
          title={`相手の墓地（${other.zones.grave.length}枚）`}
          cards={other.zones.grave}
          zone="grave"
          color={zoneColors.grave}
          selectedIds={selectedCards[other.id] || []}
          onSelect={id => handleCardClick(other.id, id)}
        />
      </div>
      <Zone
        title={`相手のバトルゾーン（${other.zones.battle.length}枚）`}
        cards={other.zones.battle}
        zone="battle"
        color={zoneColors.battle}
        selectedIds={selectedCards[other.id] || []}
        onSelect={id => handleCardClick(other.id, id)}
      />

      {/* 自分ゾーン */}
      <Zone
        title={`自分の手札（${self.zones.hand.length}枚）`}
        cards={self.zones.hand}
        zone="hand"
        color={zoneColors.hand}
        selectedIds={selectedCards[self.id] || []}
        onSelect={id => handleCardClick(self.id, id)}
        onDraw={() => drawCard(self.id)}
      />
      <Zone
        title={`自分のマナゾーン（${self.zones.mana.length}枚）`}
        cards={self.zones.mana}
        zone="mana"
        color={zoneColors.mana}
        selectedIds={selectedCards[self.id] || []}
        onSelect={id => handleCardClick(self.id, id)}
      />
      <Zone
        title={`自分のシールドゾーン（${self.zones.shield.length}枚）`}
        cards={self.zones.shield.map(c => ({ ...c, isFaceDown: true }))}
        zone="shield"
        color={zoneColors.shield}
        selectedIds={selectedCards[self.id] || []}
        onSelect={id => handleCardClick(self.id, id)}
      />
      <Zone
        title={`自分の山札（${self.zones.deck.length}枚）`}
        cards={self.zones.deck}
        zone="deck"
        color={zoneColors.deck}
        selectedIds={[]}
        onDraw={() => moveTopDeckCardToZone(self.id, 'deck')}
      />
      <Zone
        title={`自分の墓地（${self.zones.grave.length}枚）`}
        cards={self.zones.grave}
        zone="grave"
        color={zoneColors.grave}
        selectedIds={selectedCards[self.id] || []}
        onSelect={id => handleCardClick(self.id, id)}
      />
      <Zone
        title={`自分のバトルゾーン（${self.zones.battle.length}枚）`}
        cards={self.zones.battle}
        zone="battle"
        color={zoneColors.battle}
        selectedIds={selectedCards[self.id] || []}
        onSelect={id => handleCardClick(self.id, id)}
      />

      {/* 操作ボタン */}
      <div className="mt-4 space-x-1 text-xs">
        <button onClick={() => moveSelectedCards(currentPlayerId, 'hand')} className="bg-blue-500 text-white px-1 py-0.5 rounded">手札に置く</button>
        <button onClick={() => moveSelectedCards(currentPlayerId, 'battle')} className="bg-red-500 text-white px-1 py-0.5 rounded">バトルに置く</button>
        <button onClick={() => moveSelectedCards(currentPlayerId, 'mana')} className="bg-green-500 text-white px-1 py-0.5 rounded">マナに置く</button>
        <button onClick={() => moveSelectedCards(currentPlayerId, 'grave')} className="bg-purple-500 text-white px-1 py-0.5 rounded">墓地に置く</button>
        <button onClick={() => moveSelectedCards(currentPlayerId, 'shield', true)} className="bg-yellow-400 text-white px-1 py-0.5 rounded">シールドに裏向き</button>
        <button onClick={() => revealSelectedShield(currentPlayerId)} className="bg-yellow-300 text-black px-1 py-0.5 rounded">シールド表向き</button>
        <button onClick={() => toggleTappedState(currentPlayerId)} className="bg-gray-700 text-white px-1 py-0.5 rounded">タップ切替</button>
      </div>
    </div>
  );
};

export default GameBoard;
