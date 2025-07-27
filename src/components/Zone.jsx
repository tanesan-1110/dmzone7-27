import React from 'react'
import Card from './Card'

export default function Zone({
  title,
  cards = [],
  onSelect,
  selectedCards = [],
  color,
  faceDown = false,
  maxRow = 1,
  showCountOnly = false,
}) {
  const getFaceDown = typeof faceDown === 'function'
    ? faceDown
    : () => !!faceDown

  return (
    <div style={{
      margin: '4px 0',
      backgroundColor: color,
      padding: 6,
      borderRadius: 5,
      userSelect: 'none',
    }}>
      <h4 style={{ margin: '0 0 6px 0', fontSize: 12, color: '#000' }}>{title}</h4>
      {showCountOnly ? (
        <p style={{ fontSize: 12, color: '#000' }}>{cards.length} 枚</p>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 4,
            flexWrap: maxRow > 1 ? 'wrap' : 'nowrap',
            overflowX: maxRow > 1 ? 'auto' : 'hidden',
          }}>
          {cards.map((card, idx) => (
            <Card
              key={card.id || idx}
              card={{
                ...card,
                selected: selectedCards.some(sel => sel.id === card.id),
                faceDown: getFaceDown(card),
              }}
              onClick={() => onSelect(card)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
