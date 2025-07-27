import React, { useState, useEffect, useRef } from 'react'
import Zone from "./components/Zone.jsx";
import sampleDeck from './data/sampleDeck.json'
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");

// ユーティリティ
const shuffle = (array) => [...array].sort(() => Math.random() - 0.5)
const now = () => new Date().toLocaleTimeString('ja-JP', { hour12: false })

export default function App() {
  const emitSync = (zonesLocal, logs, turnPlayer) => {
    socket.emit('syncState', {
      roomId,
      state: {
        zones: localToNetwork(zonesLocal, playerId), // 変換
        logs: Array.isArray(logs) ? logs : [],
        turnPlayer,
      }
    });
  };
  const ignoreSync = useRef(false); // 無限ループ防止フラグ
  // これをApp関数の最初の方で追加
  const playerId = new URLSearchParams(window.location.search).get('player') || '1'; // 1 or 2
  const my = 'my';
  const opp = 'opp';

  // 初期デッキ複製・ID振り
  const [originalDeck] = useState([...sampleDeck])
  const withUniqueId = (cards) => cards.map((c, i) => ({ ...c, id: c.id || `${c.name}-${Math.random()}` }))

  // 各ゾーン状態
  const [zones, setZones] = useState({
    my: {
      deck: [],
      hand: [],
      shield: [],
      mana: [],
      battle: [],
      grave: [],
      shieldShowMap: {},
      openZone: [],
    },
    opp: {
      deck: [],
      hand: [],
      shield: [],
      mana: [],
      battle: [],
      grave: [],
      shieldShowMap: {},
      openZone: [],
    }
  });
  // 選択カード/山札
  const [selectedCards, setSelectedCards] = useState({ my: [], opp: [], open: [] })
  const [selectedDeck, setSelectedDeck] = useState({ my: false, opp: false });
  const [selectedOpen, setSelectedOpen] = useState({ my: [], opp: [] });

  // ログ＆ターン管理
  const [logs, setLogs] = useState([])
  const [turnPlayer, setTurnPlayer] = useState(null)

  // n枚見るModal & 表向きゾーン
  const [lookModal, setLookModal] = useState({ show: false, player: null, n: 0 })
  const [lookCards, setLookCards] = useState({ [my]: [], [opp]: [] })
  const [lookSelected, setLookSelected] = useState({ [my]: [], [opp]: [] })
  const [openZone, setOpenZone] = useState({ [my]: [], [opp]: [] })

  // シールドn枚見る
  const [showShieldLook, setShowShieldLook] = useState({ show: false, player: null, n: 0 })
  const [shieldLookCards, setShieldLookCards] = useState([])

  const roomId = new URLSearchParams(window.location.search).get('room') || 'defaultRoom';

  // function localToNetwork(zones) {
  //   return {
  //     [my]: { ...zones[my] },
  //     [opp]: { ...zones[opp] }
  //   }
  // }
  // function networkToLocal(zones) {
  //   return {
  //     [my]: { ...zones[my] },
  //     [opp]: { ...zones[opp] }
  //   }
  // }

  
  function localToNetwork(zones, playerId) {
    return {
      player1: playerId === '1' ? zones.my : zones.opp,
      player2: playerId === '1' ? zones.opp : zones.my,
    }
  }
  function networkToLocal(zones, playerId) {
    return {
      my: playerId === '1' ? zones.player1 : zones.player2,
      opp: playerId === '1' ? zones.player2 : zones.player1,
    }
  }

  // useEffect(() => {
  //   if (ignoreSync.current) {
  //     ignoreSync.current = false; // 一度だけ無効化
  //     return;
  //   }
  //   console.log('syncState送信内容:', {
  //     roomId,
  //     state: {
  //       zones: localToNetwork(zones, playerId),
  //       logs,
  //       turnPlayer,
  //     }
  //   });
  //   socket.emit('syncState', {
  //     roomId,
  //     state: {
  //       zones: localToNetwork(zones, playerId),
  //       logs,
  //       turnPlayer,
  //       // 必要に応じて他のuseStateもここに追加
  //     }
  //   });
  // }, [zones, logs, turnPlayer]);

  // useEffect(() => {
  //   socket.emit('syncState', {
  //     roomId,
  //     state: {
  //       zones: localToNetwork(zones, playerId),
  //       logs,
  //       turnPlayer,
  //       // 必要に応じて他のuseStateもここに追加
  //     }
  //   });
  // }, [zones, logs, turnPlayer]);

  useEffect(() => {
    socket.emit('joinRoom', roomId);
    socket.on('joined', (playerNum) => {console.log('joined:', playerNum);});

    socket.on('syncState', (state) => {
      console.log("受信:", state.zones, "playerId:", playerId);
      // ignoreSync.current = true;
      setZones(networkToLocal(state.zones, playerId));
      setLogs(Array.isArray(state.logs) ? state.logs : []);
      setTurnPlayer(state.turnPlayer);
    });

    // クリーンアップ
    return () => {
      socket.off('joined');
      socket.off('syncState');
    };
  }, []);
  const resetGame = () => {
    console.log('resetGame実行！');
    const deck1 = shuffle(withUniqueId(originalDeck))
    const deck2 = shuffle(withUniqueId(originalDeck))
    const setupPlayer = (deck) => {
      const shield = deck.splice(0, 5).map(c => ({ ...c, faceDown: true }))
      const hand = deck.splice(0, 5).map(c => ({ ...c, faceDown: false }))
      return {
        deck,
        shield,
        hand,
        mana: [],
        battle: [],
        grave: [],
        shieldShowMap: {},
        openZone: [],
      }
    }
    const zones = {
      [my]: setupPlayer(deck1),
      [opp]: setupPlayer(deck2)
    }
    const logs = []
    const turnPlayer = 'my'
    setZones(zones)
    setLogs(logs)
    setTurnPlayer(turnPlayer)
    setSelectedCards({ my: [], opp: [], open: [] });
    setSelectedDeck({ my: false, opp: false });
    setSelectedOpen({ my: [], opp: [] });
    setLookCards({ [my]: [], [opp]: [] })
    setOpenZone({ [my]: [], [opp]: [] })
    // ここでemitだけ！
    emitSync(zones, logs, turnPlayer);
  }

  // シャッフル
  const handleShuffle = (player) => {
    setZones(prev => {
      const newZones = {
        ...prev,
        [player]: { ...prev[player], deck: shuffle(prev[player].deck) }
      }
      emitSync(newZones)
      return newZones
    })
    addLog(`${player === 'my' ? 'あなた' : '相手'}の山札をシャッフルした`)
  }


  // // 初期化
  // const resetGame = () => {
  //   const deck1 = shuffle(withUniqueId(originalDeck))
  //   const deck2 = shuffle(withUniqueId(originalDeck))
  //   const setupPlayer = (deck) => {
  //     const shield = deck.splice(0, 5).map(c => ({ ...c, faceDown: true }))
  //     const hand = deck.splice(0, 5).map(c => ({ ...c, faceDown: false }))
  //     return {
  //       deck,
  //       shield,
  //       hand,
  //       mana: [],
  //       battle: [],
  //       grave: [],
  //       shieldShowMap: {},
  //       openZone: [],
  //     }
  //   }
  //   setZones({
  //     [my]: setupPlayer(deck1),
  //     [opp]: setupPlayer(deck2)
  //   })
  //   setSelectedCards({ [my]: [], [opp]: [], open: [] })
  //   setSelectedDeck({ [my]: false, [opp]: false })
  //   setSelectedOpen({ [my]: [], [opp]: [] })
  //   setLookCards({ [my]: [], [opp]: [] })
  //   setOpenZone({ [my]: [], [opp]: [] })
  //   setLogs([])
  //   setTurnPlayer('my')
  // }

  // ログ追加（50件まで）
  const addLog = (msg) => setLogs(prev => {
    const log = `[${now()}] ${msg}`
    return [log, ...prev].slice(0, 50)
  })

  // 選択系
  const toggleSelect = (player, card, zoneType = null) => {
    setSelectedCards(prev => {
      const arr = prev[player] || [];
      const exists = arr.find(c => c.id === card.id);
      return {
        ...prev,
        [player]: exists ? arr.filter(c => c.id !== card.id) : [...arr, card],
      };
    });
  };

  // 表向きゾーンカード選択
  const toggleSelectOpen = (player, card) => {
    setSelectedOpen(prev => {
      const arr = prev[player] || []
      const exists = arr.find(c => c.id === card.id)
      return {
        ...prev,
        [player]: exists ? arr.filter(c => c.id !== card.id) : [...arr, card]
      }
    })
  }

  // 山札クリックで選択
  const handleDeckClick = (player) => {
    setSelectedCards(prev => ({ ...prev, [player]: [] }))
    setSelectedDeck(prev => ({ ...prev, [player]: !prev[player] }))
    setSelectedOpen({ [my]: [], [opp]: [] })
  }

  // シールドの表裏
  const toggleShieldFace = (player) => {
    setZones(prev => {
      const newMap = { ...prev[player].shieldShowMap }
      selectedCards[player].forEach(card => { newMap[card.id] = !newMap[card.id] })
      const zonesAll = {
        ...prev,
        [player]: { ...prev[player], shieldShowMap: newMap }
      }
      emitSync(zonesAll)
      return zonesAll
    })
    addLog(`${player === 'my' ? 'あなた' : '相手'}のシールドを表向きにした`)
  }

  // シールドゾーンの「見る」 n枚だけ一時的にリスト化してモーダルで表示
  const handleShieldLook = (player, n) => {
    const cards = zones[player].shield.filter(c => !zones[player].shieldShowMap[c.id]).slice(0, n)
    setShieldLookCards(cards)
    setShowShieldLook({ show: true, player, n })
  }

  // 「山札のn枚を見る」モーダル
  const openLookModal = (player) => setLookModal({ show: true, player, n: 0 })
  const closeLookModal = () => {
    // n枚戻す
    if (lookCards[lookModal.player].length > 0) {
      setZones(prev => {
        const deck = prev[lookModal.player].deck
        return {
          ...prev,
          [lookModal.player]: {
            ...prev[lookModal.player],
            deck: [...lookCards[lookModal.player], ...deck]
          }
        }
      })
      setLookCards(prev => ({ ...prev, [lookModal.player]: [] }))
      setLookSelected(prev => ({ ...prev, [lookModal.player]: [] }))
    }
    setLookModal({ show: false, player: null, n: 0 })
  }

  const handleLookN = (player, n) => {
    setZones(prev => {
      const deck = prev[player].deck
      const look = deck.slice(0, n)
      const rest = deck.slice(n)
      setLookCards(lc => ({ ...lc, [player]: look }))
      setLookSelected(sel => ({ ...sel, [player]: [] }))
      return {
        ...prev,
        [player]: { ...prev[player], deck: rest }
      }
    })
  }

  // 「n枚表向き」→全体公開のopenZoneへ
  const handleOpenN = (player, n) => {
    setZones(prevZones => {
      const deck = prevZones[player].deck
      const toOpen = deck.slice(0, n).map(c => ({ ...c, faceDown: false }))
      const rest = deck.slice(n)
      // openZoneも一緒に更新！
      setOpenZone(prevOpen => ({
        ...prevOpen,
        [player]: [...prevOpen[player], ...toOpen]
      }))
      return {
        ...prevZones,
        [player]: { ...prevZones[player], deck: rest }
      }
    })
    addLog(`${player === 'my' ? 'あなた' : '相手'}の山札から${n}枚を全体公開した`)
  }


  // 表向きゾーンからカード移動
  const moveOpenToZone = (player, targetZone) => {
    const sel = selectedOpen[player] || []
    if (!sel.length) return
    setZones(prev => {
      const currentOpen = openZone[player]
      const remaining = currentOpen.filter(c => !sel.some(s => s.id === c.id))
      return {
        ...prev,
        [player]: {
          ...prev[player],
          [targetZone]: [...prev[player][targetZone], ...sel],
        }
      }
    })
    setOpenZone(prev => ({
      ...prev,
      [player]: prev[player].filter(c => !sel.some(s => s.id === c.id))
    }))
    setSelectedOpen({ [my]: [], [opp]: [] })
    addLog(`${player === 'my' ? 'あなた' : '相手'}の全体公開ゾーンから${sel.length}枚を${zoneName(targetZone)}に移動`)
  }

  // 見たカードmodalから移動
  const moveLookToZone = (player, targetZone) => {
    const sel = lookSelected[player]
    if (!sel.length) return
    setZones(prev => {
      const others = lookCards[player].filter(c => !sel.some(s => s.id === c.id))
      return {
        ...prev,
        [player]: {
          ...prev[player],
          [targetZone]: [...prev[player][targetZone], ...sel],
          deck: [...others, ...prev[player].deck]
        }
      }
    })
    setLookCards(prev => ({ ...prev, [player]: [] }))
    setLookSelected(prev => ({ ...prev, [player]: [] }))
    setLookModal({ show: false, player: null, n: 0 })
    addLog(`${player === 'my' ? 'あなた' : '相手'}が山札の上から${sel.length}枚を${zoneName(targetZone)}に移動(見る)`)
  }

  // 通常カード移動
  const moveSelectedTo = (player, targetZone, position = 'end') => {
    if (selectedDeck[player]) {
      setZones(prev => {
        if (prev[player].deck.length === 0) return prev
        const [top, ...rest] = prev[player].deck
        const toAdd = { ...top, faceDown: false }
        let newPlayerZones = { ...prev[player], deck: rest }
        if (targetZone === 'deck') {
          if (position === 'start') newPlayerZones.deck = [toAdd, ...newPlayerZones.deck]
          else newPlayerZones.deck = [...newPlayerZones.deck, toAdd]
        } else if (targetZone === 'shield') {
          newPlayerZones.shield = [...newPlayerZones.shield, { ...toAdd, faceDown: true }]
        } else {
          newPlayerZones[targetZone] = [...newPlayerZones[targetZone], toAdd]
        }
        const zonesAll = { ...prev, [player]: newPlayerZones }
        emitSync(zonesAll)
        addLog(`${player === 'my' ? 'あなた' : '相手'}が山札の上カードを${zoneName(targetZone)}に移動`)
        return zonesAll
      })
      setSelectedDeck(prev => ({ ...prev, [player]: false }))
      return
    }

    setZones(prev => {
      const fromZones = ['hand', 'battle', 'mana', 'grave', 'shield', 'deck', 'openZone']
      const selected = selectedCards[player]
      const newPlayerZones = { ...prev[player] }
      fromZones.forEach(zone => {
        newPlayerZones[zone] = newPlayerZones[zone].filter(card => !selected.some(s => s.id === card.id))
      })
      const toAdd = selected.map(c => {
        if (targetZone === 'shield') return { ...c, faceDown: true }
        return { ...c, faceDown: false }
      })
      if (targetZone === 'deck') {
        if (position === 'start') newPlayerZones.deck = [...toAdd, ...newPlayerZones.deck]
        else newPlayerZones.deck = [...newPlayerZones.deck, ...toAdd]
      } else {
        newPlayerZones[targetZone] = [...newPlayerZones[targetZone], ...toAdd]
      }
      const zonesAll = { ...prev, [player]: newPlayerZones }
      emitSync(zonesAll)
      addLog(`${player === 'my' ? 'あなた' : '相手'}が${zoneNameArr(selected)}を${zoneName(targetZone)}に移動`)
      return { ...prev, [player]: newPlayerZones }
    })
    setSelectedCards(prev => ({ ...prev, [player]: [] }))
  }

  // タップ/アンタップ（ここ！消しません！）
  const toggleTap = (player, zoneType) => {
    setZones(prev => {
      const arr = selectedCards[player]
      if (!arr.length) return prev
      let z = { ...prev[player] }
      z[zoneType] = z[zoneType].map(c => arr.find(sel => sel.id === c.id) ? { ...c, tapped: !c.tapped } : c)
      const zonesAll = { ...prev, [player]: z }
      emitSync(zonesAll)
      addLog(`${player === 'my' ? 'あなた' : '相手'}が${zoneType === 'mana' ? 'マナゾーン' : 'バトルゾーン'}のカードをタップ/アンタップ`)
      return zonesAll
    })
    setSelectedCards(prev => ({ ...prev, [player]: [] }))
  }


  // ドロー
  const drawCard = () => {
    setZones(prev => {
      if (prev[my].deck.length === 0) return prev
      const cardToDraw = prev[my].deck[0]
      const newDeck = prev[my].deck.slice(1)
      const newHand = [...prev[my].hand, { ...cardToDraw, faceDown: false }]
      const zonesAll = { ...prev, [my]: { ...prev[my], deck: newDeck, hand: newHand } }
      emitSync(zonesAll)
      addLog(`あなたがドローした`)
      return zonesAll
    })
  }


  // ターン終了
  const handleEndTurn = () => {
    const next = turnPlayer === 'my' ? 'opp' : 'my'
    setTurnPlayer(next)
    addLog(`${turnPlayer === 'my' ? 'あなた' : '相手'}はターンを終了した。次は${next === 'my' ? 'あなた' : '相手'}のターンです`)
    emitSync(zones, logs, next)
  }

  // ゾーン名
  function zoneName(z) {
    return ({
      hand: "手札",
      battle: "バトルゾーン",
      mana: "マナゾーン",
      grave: "墓地",
      shield: "シールドゾーン",
      deck: "山札",
      openZone: "表向きゾーン"
    })[z] || z
  }
  function zoneNameArr(arr) {
    return arr.map(c => c.name).join('、')
  }

  // ボタン共通スタイル
  const btnStyle = { fontSize: 11, padding: '4px', margin: '2px 0', minWidth: 70 }

  // 各ゾーンカラー
  const zoneColors = {
    mana: '#d8f3d8',
    shield: '#fff9c4',
    hand: '#cce0ff',
    grave: '#e6d6ff',
    battle: '#ffcccc',
    deck: '#999999',
    openZone: '#ffd',
  }

  // 山札テクスチャ
  const renderDeck = (cards, selected, onClick, showBtns = null) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        onClick={onClick}
        style={{
          width: 30,
          height: 45,
          borderRadius: 4,
          background: 'repeating-linear-gradient(135deg, #222 0 10px, #333 10px 20px)',
          boxShadow: selected ? '0 0 0 3px red' : '0 0 6px rgba(0,0,0,0.6)',
          color: '#eee',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          userSelect: 'none',
          position: 'relative',
          cursor: 'pointer'
        }}>
        <div style={{ fontWeight: 'bold' }}>{cards.length === 0 ? "山札切れ" : "裏向き"}</div>
        {cards.length > 0 && <div style={{ fontSize: 13 }}>{cards.length}枚</div>}
        {selected && (
          <div style={{
            position: 'absolute', inset: 0, border: '2.5px solid red',
            borderRadius: 4, pointerEvents: 'none'
          }} />
        )}
      </div>
      <div>{showBtns}</div>
    </div>
  )

  // Modal部品
  const [inputN, setInputN] = useState('')
  const [inputOpenN, setInputOpenN] = useState('')
  const [inputShieldN, setInputShieldN] = useState('')

  // selectionロック
  const selectionLocked = (player) => selectedDeck[player];

  return (
    <div style={{
      backgroundColor: '#121212', color: '#eee', minHeight: '100vh', padding: 12,
      fontFamily: 'Arial, sans-serif', userSelect: 'none', fontSize: 12, lineHeight: 1.3, display: 'flex'
    }}>
      {/* ログウインドウ */}
      <div style={{
        width: 280, background: '#222', borderRadius: 7, marginRight: 16, padding: 10,
        height: '98vh', overflowY: 'auto', fontSize: 11, boxSizing: 'border-box'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 7 }}>ログ履歴（{Array.isArray(logs) ? logs.length : 0}件）</div>
        {Array.isArray(logs) && logs.map((log, idx) => (
          <div key={idx} style={{ marginBottom: 2, whiteSpace: 'pre-line', wordBreak: 'break-all' }}>{log}</div>
        ))}
      </div>

      {/* ゲーム盤 */}
      <div style={{ flex: 1 }}>
        <h1 style={{ marginBottom: 6 }}>DM Zones</h1>
        <button onClick={resetGame} style={{ marginBottom: 12, fontSize: 12, padding: '6px 12px' }}>ゲーム開始</button>
        <div style={{ marginBottom: 10 }}>
          現在のターン：<span style={{ fontWeight: 'bold' }}>{turnPlayer === 'my' ? 'player1' : 'player2'}</span>
          <button onClick={handleEndTurn} style={{ ...btnStyle, marginLeft: 12 }}>ターン終了</button>
        </div>

        {/* --- 相手手札 */}
        <Zone
          title="相手の手札"
          cards={zones[opp].hand}
          onSelect={card => !selectionLocked('opp') && toggleSelect('opp', card)}
          selectedCards={selectedCards[opp]}
          color={zoneColors.hand}
          showCountOnly={false}
          faceDown={true}
          maxRow={1}
        />
        <div style={{ textAlign: 'right', marginBottom: 6 }}>
          <button onClick={() => moveSelectedTo('opp', 'hand')} disabled={selectedCards[opp].length === 0 && !selectedDeck[opp]} style={btnStyle}>手札に置く</button>
        </div>
        {/* 相手マナゾーン */}
        <Zone
          title="相手のマナゾーン"
          cards={zones[opp].mana}
          onSelect={card => !selectionLocked('opp') && toggleSelect('opp', card)}
          selectedCards={selectedCards[opp]}
          color={zoneColors.mana}
          faceDown={false}
          maxRow={1}
          onTap={() => toggleTap('opp', 'mana')}
          showTapButton
        />
        <div style={{ textAlign: 'right', marginBottom: 6 }}>
          <button onClick={() => toggleTap('opp', 'mana')} disabled={selectedCards[opp].length === 0} style={btnStyle}>タップ切替</button>
          <button onClick={() => moveSelectedTo('opp', 'mana')} disabled={selectedCards[opp].length === 0 && !selectedDeck[opp]} style={btnStyle}>マナゾーンに置く</button>
        </div>
        {/* 相手シールド・山札・墓地 横並び */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <Zone
              title="相手のシールド"
              cards={zones[opp].shield}
              onSelect={card => !selectionLocked('opp') && toggleSelect('opp', card)}
              selectedCards={selectedCards[opp]}
              color={zoneColors.shield}
              faceDown={card => !zones[opp].shieldShowMap[card.id]}
              maxRow={1}
            />
            <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
              <button onClick={() => toggleShieldFace('opp')} disabled={selectedCards[opp].length === 0} style={btnStyle}>選択したシールドを表に</button>
              <button onClick={() => moveSelectedTo('opp', 'shield')} disabled={selectedCards[opp].length === 0 && !selectedDeck[opp]} style={btnStyle}>シールドゾーンに置く</button>
            </div>
          </div>
          <div style={{ width: 80, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {renderDeck(zones[opp].deck, selectedDeck[opp], () => {
              if (!selectedCards[opp].length && !lookModal.show) handleDeckClick('opp')
            }, (
              <div style={{ marginTop: 4 }}>
                <button onClick={() => handleShuffle('opp')} style={btnStyle}>シャッフル</button><br />
                <input type="number" value={inputOpenN} onChange={e => setInputOpenN(e.target.value)} style={{ width: 32, fontSize: 11, marginRight: 2 }} min={1} />
                <button onClick={() => handleOpenN('opp', Number(inputOpenN))} style={btnStyle}>n枚表向き</button>
                <input type="number" value={inputN} onChange={e => setInputN(e.target.value)} style={{ width: 32, fontSize: 11, margin: '2px 2px 2px 8px' }} min={1} />
                <button onClick={() => openLookModal('opp')} style={btnStyle}>n枚見る</button>
                <button onClick={() => moveSelectedTo('opp', 'deck', 'start')} disabled={selectedCards[opp].length === 0 && !selectedDeck[opp]} style={btnStyle}>山札の一番上</button>
                <button onClick={() => moveSelectedTo('opp', 'deck', 'end')} disabled={selectedCards[opp].length === 0 && !selectedDeck[opp]} style={btnStyle}>山札の一番下</button>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <Zone
              title="相手の墓地"
              cards={zones[opp].grave}
              onSelect={card => !selectionLocked('opp') && toggleSelect('opp', card)}
              selectedCards={selectedCards[opp]}
              color={zoneColors.grave}
              faceDown={false}
              maxRow={1}
            />
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <button onClick={() => moveSelectedTo('opp', 'grave')} disabled={selectedCards[opp].length === 0 && !selectedDeck[opp]} style={btnStyle}>墓地に置く</button>
            </div>
          </div>
        </div>
        {/* 相手バトルゾーン */}
        <Zone
          title="相手のバトルゾーン"
          cards={zones[opp].battle}
          onSelect={card => !selectionLocked('opp') && toggleSelect('opp', card)}
          selectedCards={selectedCards[opp]}
          color={zoneColors.battle}
          faceDown={false}
          maxRow={1}
          onTap={() => toggleTap('opp', 'battle')}
          showTapButton
        />
        <div style={{ textAlign: 'right', marginBottom: 6 }}>
          <button onClick={() => toggleTap('opp', 'battle')} disabled={selectedCards[opp].length === 0} style={btnStyle}>タップ切替</button>
          <button onClick={() => moveSelectedTo('opp', 'battle')} disabled={selectedCards[opp].length === 0 && !selectedDeck[opp]} style={btnStyle}>バトルゾーンに置く</button>
        </div>
        {/* 相手表向きゾーン */}
        {openZone[opp].length > 0 && (
          <Zone
            title="相手の表向きゾーン"
            cards={openZone[opp]}
            onSelect={card => toggleSelectOpen('opp', card)}
            selectedCards={selectedOpen[opp]}
            color={zoneColors.openZone}
            faceDown={false}
            maxRow={1}
          />
        )}
        {openZone[opp].length > 0 && (
          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <button onClick={() => moveOpenToZone('opp', 'hand')} disabled={selectedOpen[opp].length === 0} style={btnStyle}>手札に</button>
            <button onClick={() => moveOpenToZone('opp', 'mana')} disabled={selectedOpen[opp].length === 0} style={btnStyle}>マナゾーンに</button>
            <button onClick={() => moveOpenToZone('opp', 'battle')} disabled={selectedOpen[opp].length === 0} style={btnStyle}>バトルゾーンに</button>
            <button onClick={() => moveOpenToZone('opp', 'grave')} disabled={selectedOpen[opp].length === 0} style={btnStyle}>墓地に</button>
          </div>
        )}

        {/* ----- 自分ゾーン ----- */}
        <Zone
          title="自分のバトルゾーン"
          cards={zones[my].battle}
          onSelect={card => !selectionLocked('my') && toggleSelect('my', card)}
          selectedCards={selectedCards[my]}
          color={zoneColors.battle}
          faceDown={false}
          maxRow={1}
          onTap={() => toggleTap('my', 'battle')}
          showTapButton
        />
        <div style={{ textAlign: 'right', marginBottom: 6 }}>
          <button onClick={() => toggleTap('my', 'battle')} disabled={selectedCards[my].length === 0} style={btnStyle}>タップ切替</button>
          <button onClick={() => moveSelectedTo('my', 'battle')} disabled={selectedCards[my].length === 0 && !selectedDeck[my]} style={btnStyle}>バトルゾーンに置く</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}></div>
          <Zone
            title="自分のマナゾーン"
            cards={zones[my].mana}
            onSelect={card => !selectionLocked('my') && toggleSelect('my', card)}
            selectedCards={selectedCards[my]}
            color={zoneColors.mana}
            faceDown={false}
            maxRow={1}
            onTap={() => toggleTap('my', 'mana')}
            showTapButton
          />
        <div style={{ textAlign: 'right', marginBottom: 6 }}>
          <button onClick={() => toggleTap('my', 'mana')} disabled={selectedCards[my].length === 0} style={btnStyle}>タップ切替</button>
          <button onClick={() => moveSelectedTo('my', 'mana')} disabled={selectedCards[my].length === 0 && !selectedDeck[my]} style={btnStyle}>マナゾーンに置く</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <Zone
              title="自分のシールド"
              cards={zones[my].shield}
              onSelect={card => !selectionLocked('my') && toggleSelect('my', card)}
              selectedCards={selectedCards[my]}
              color={zoneColors.shield}
              faceDown={card => !zones[my].shieldShowMap[card.id]}
              maxRow={1}
            />
            <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
              <button onClick={() => toggleShieldFace('my')} disabled={selectedCards[my].length === 0} style={btnStyle}>選択したシールドを表に</button>
              <button onClick={() => moveSelectedTo('my', 'shield')} disabled={selectedCards[my].length === 0 && !selectedDeck[my]} style={btnStyle}>シールドゾーンに置く</button>
            </div>
          </div>
          <div style={{ width: 80, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {renderDeck(zones[my].deck, selectedDeck[my], () => {
              if (!selectedCards[my].length && !lookModal.show) handleDeckClick('my')
            }, (
              <div style={{ marginTop: 4 }}>
                <button onClick={() => handleShuffle('my')} style={btnStyle}>シャッフル</button><br />
                <input type="number" value={inputOpenN} onChange={e => setInputOpenN(e.target.value)} style={{ width: 32, fontSize: 11, marginRight: 2 }} min={1} />
                <button onClick={() => handleOpenN('my', Number(inputOpenN))} style={btnStyle}>n枚表向き</button>
                <input type="number" value={inputN} onChange={e => setInputN(e.target.value)} style={{ width: 32, fontSize: 11, margin: '2px 2px 2px 8px' }} min={1} />
                <button onClick={() => openLookModal('my')} style={btnStyle}>n枚見る</button>
                <button onClick={() => moveSelectedTo('my', 'deck', 'start')} disabled={selectedCards[my].length === 0 && !selectedDeck[my]} style={btnStyle}>山札の一番上</button>
                <button onClick={() => moveSelectedTo('my', 'deck', 'end')} disabled={selectedCards[my].length === 0 && !selectedDeck[my]} style={btnStyle}>山札の一番下</button>
              </div>
            ))}
            <button onClick={drawCard} style={{ ...btnStyle, marginTop: 4 }} disabled={zones[my].deck.length === 0}>ドロー</button>
          </div>
          <div style={{ flex: 1 }}>
            <Zone
              title="自分の墓地"
              cards={zones[my].grave}
              onSelect={card => !selectionLocked('my') && toggleSelect('my', card)}
              selectedCards={selectedCards[my]}
              color={zoneColors.grave}
              faceDown={false}
              maxRow={1}
            />
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <button onClick={() => moveSelectedTo('my', 'grave')} disabled={selectedCards[my].length === 0 && !selectedDeck[my]} style={btnStyle}>墓地に置く</button>
            </div>
          </div>
        </div>
        {/* 自分表向きゾーン */}
        {openZone[my].length > 0 && (
          <Zone
            title="自分の表向きゾーン"
            cards={openZone[my]}
            onSelect={card => toggleSelectOpen('my', card)}
            selectedCards={selectedOpen[my]}
            color={zoneColors.openZone}
            faceDown={false}
            maxRow={1}
          />
        )}
        {openZone[my].length > 0 && (
          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <button onClick={() => moveOpenToZone('my', 'hand')} disabled={selectedOpen[my].length === 0} style={btnStyle}>手札に</button>
            <button onClick={() => moveOpenToZone('my', 'mana')} disabled={selectedOpen[my].length === 0} style={btnStyle}>マナゾーンに</button>
            <button onClick={() => moveOpenToZone('my', 'battle')} disabled={selectedOpen[my].length === 0} style={btnStyle}>バトルゾーンに</button>
            <button onClick={() => moveOpenToZone('my', 'grave')} disabled={selectedOpen[my].length === 0} style={btnStyle}>墓地に</button>
          </div>
        )}

        {/* 自分手札 */}
        <Zone
          title="自分の手札"
          cards={zones[my].hand}
          onSelect={card => !selectionLocked('my') && toggleSelect('my', card)}
          selectedCards={selectedCards[my]}
          color={zoneColors.hand}
          faceDown={false}
          maxRow={1}
        />
        <div style={{ textAlign: 'right', marginBottom: 6 }}>
          <button onClick={() => moveSelectedTo('my', 'hand')} disabled={selectedCards[my].length === 0 && !selectedDeck[my]} style={btnStyle}>手札に置く</button>
        </div>
      </div>
    </div>
  )
}
