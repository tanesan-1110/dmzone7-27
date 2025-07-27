import React from 'react'

export default function Card({ card, onClick }) {
  const isFaceDown = typeof card.faceDown === 'function' ? card.faceDown(card) : card.faceDown
  const style = {
    border: card.selected ? '2.5px solid red' : '1px solid #555',
    backgroundColor: isFaceDown ? '#444' : '#fff',
    color: isFaceDown ? '#eee' : '#000',
    width: 30,
    height: 45,
    borderRadius: 4,
    cursor: onClick ? 'pointer' : 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    userSelect: 'none',
    textAlign: 'center',
    transition: 'transform 0.18s',
    transform: card.tapped ? 'rotate(-90deg)' : 'none',
  }

  return (
    <div style={style} onClick={onClick}>
      {isFaceDown ? '裏向き' : card.name}
    </div>
  )
}
