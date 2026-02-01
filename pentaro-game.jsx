import React, { useState, useEffect, useRef, useCallback } from ‘react’;

// ===== 定数定義 =====
const CONTAINER_WIDTH = 350;
const CONTAINER_HEIGHT = 500;
const WALL_THICKNESS = 12;
const GAME_OVER_LINE = 100;
const DROP_Y = 50;
const PUNCH_COST = 50;
const GRAVITY = 0.35;
const FRICTION = 0.75;
const BOUNCE = 0.3;

// ぺんたろうの成長段階
const PENTARO_STAGES = [
{ name: ‘たまご’, size: 30, color: ‘#E8F4F8’, score: 1 },
{ name: ‘ひよこぺんたろう’, size: 45, color: ‘#B8E4F0’, score: 3 },
{ name: ‘こぺんたろう’, size: 60, color: ‘#87CEEB’, score: 6 },
{ name: ‘ぺんたろう’, size: 80, color: ‘#5BC0DE’, score: 10 },
{ name: ‘おおぺんたろう’, size: 100, color: ‘#3498DB’, score: 15 },
{ name: ‘キングぺんたろう’, size: 130, color: ‘#2980B9’, score: 21 },
{ name: ‘エンペラーぺんたろう’, size: 160, color: ‘#1A5276’, score: 28 },
];

// シェイクアニメーション
const shakeStyle = `@keyframes shake { 0%, 100% { transform: translateX(0) rotate(0); } 10% { transform: translateX(-8px) rotate(-2deg); } 20% { transform: translateX(8px) rotate(2deg); } 30% { transform: translateX(-6px) rotate(-1deg); } 40% { transform: translateX(6px) rotate(1deg); } 50% { transform: translateX(-4px) rotate(-0.5deg); } 60% { transform: translateX(4px) rotate(0.5deg); } 70% { transform: translateX(-2px) rotate(0); } 80% { transform: translateX(2px) rotate(0); } 90% { transform: translateX(-1px) rotate(0); } } .animate-shake { animation: shake 0.5s ease-in-out; }`;

// ===== ローカルストレージ用ヘルパー =====
const storage = {
get: (key) => {
try {
const item = localStorage.getItem(key);
return item ? JSON.parse(item) : null;
} catch (e) {
return null;
}
},
set: (key, value) => {
try {
localStorage.setItem(key, JSON.stringify(value));
} catch (e) {}
}
};

// ===== ぺんたろうSVGコンポーネント =====
const Pentaro = React.memo(({ x, y, stage, rotation = 0 }) => {
const { size, color } = PENTARO_STAGES[stage];
const radius = size / 2;

if (stage === 0) {
return (
<g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
<ellipse cx=“0” cy=“0” rx={radius * 0.8} ry={radius} fill=”#FFF8E7” stroke=”#3D3122” strokeWidth=“2” />
<ellipse cx=“0” cy=”-5” rx={radius * 0.3} ry={radius * 0.4} fill=”#FFE4B5” opacity=“0.5” />
</g>
);
}

const bodyScale = size / 80;
const isKing = stage >= 5;
const isEmperor = stage >= 6;
const outline = “#3B2417”;
const strokeW = 3;

return (
<g transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${bodyScale})`}>
<path d="M-20 -5 Q-45 -20 -50 -5 Q-55 10 -40 15 Q-25 18 -20 10 Z" 
fill={color} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round"/>
<path d="M20 0 Q40 5 45 15 Q50 30 40 35 Q25 38 20 25 Z" 
fill={color} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round"/>
<path d="M0 -45 C-35 -45 -40 -20 -38 5 C-36 25 -30 40 -15 45 L15 45 C30 40 36 25 38 5 C40 -20 35 -45 0 -45 Z" 
fill={color} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round"/>
<ellipse cx="0" cy="15" rx="22" ry="28" fill="white" />
<ellipse cx="0" cy="-18" rx="22" ry="20" fill="white" />
<circle cx="-10" cy="-22" r="5" fill={outline} />
<circle cx="10" cy="-22" r="5" fill={outline} />
<ellipse cx="0" cy="-8" rx="8" ry="5" fill="#FFAA33" stroke={outline} strokeWidth="2" />
<ellipse cx="0" cy="-5" rx="5" ry="3" fill="#FF7777" />
<g transform="translate(0, 8)">
<path d="M-4 0 C-8 -8 -18 -8 -18 0 C-18 8 -8 8 -4 0" fill="#E54C4C" stroke={outline} strokeWidth="2"/>
<path d="M4 0 C8 -8 18 -8 18 0 C18 8 8 8 4 0" fill="#E54C4C" stroke={outline} strokeWidth="2"/>
<rect x="-5" y="-5" width="10" height="10" rx="2" fill="#C43C3C" stroke={outline} strokeWidth="2" />
</g>
<ellipse cx="-15" cy="48" rx="12" ry="6" fill="#FFAA33" stroke={outline} strokeWidth="2.5" />
<ellipse cx="15" cy="48" rx="12" ry="6" fill="#FFAA33" stroke={outline} strokeWidth="2.5" />
{isKing && (
<g transform="translate(0, -55)">
<path d=“M-18 12 L-22 -5 L-12 3 L0 -12 L12 3 L22 -5 L18 12 Z”
fill={isEmperor ? “#FFD700” : “#FFC107”} stroke={outline} strokeWidth=“2.5” strokeLinejoin=“round”/>
<circle cx=“0” cy=”-6” r=“4” fill={isEmperor ? “#E74C3C” : “#FF5722”} stroke={outline} strokeWidth=“1.5” />
<circle cx=”-12” cy=“2” r=“3” fill={isEmperor ? “#4A90D9” : “#2196F3”} stroke={outline} strokeWidth=“1.5” />
<circle cx=“12” cy=“2” r=“3” fill={isEmperor ? “#4A90D9” : “#2196F3”} stroke={outline} strokeWidth=“1.5” />
</g>
)}
</g>
);
});

// ===== メインゲームコンポーネント =====
export default function PentaroGame() {
// UI状態
const [score, setScore] = useState(0);
const [highScore, setHighScore] = useState(0);
const [nextStage, setNextStage] = useState(0);
const [dropX, setDropX] = useState(CONTAINER_WIDTH / 2);
const [gameStarted, setGameStarted] = useState(false);
const [gameOver, setGameOver] = useState(false);
const [renderTrigger, setRenderTrigger] = useState(0);

// エフェクト
const [mergeEffects, setMergeEffects] = useState([]);
const [isShaking, setIsShaking] = useState(false);
const [showPunchEffect, setShowPunchEffect] = useState(false);

// パンチ
const [punchReady, setPunchReady] = useState(false);
const [punchChargeScore, setPunchChargeScore] = useState(0);

// ランキング
const [rankings, setRankings] = useState([]);
const [showNameInput, setShowNameInput] = useState(false);
const [playerName, setPlayerName] = useState(’’);

// Refs（物理演算用 - Reactのレンダリングから独立）
const containerRef = useRef(null);
const ballsRef = useRef([]);
const ballIdRef = useRef(0);
const canDropRef = useRef(true);
const gameOverRef = useRef(false);
const scoreRef = useRef(0);
const animationRef = useRef(null);
const lastTimeRef = useRef(0);
const mergeQueueRef = useRef([]);
const scoreQueueRef = useRef(0);

// スコア同期
useEffect(() => { scoreRef.current = score; }, [score]);
useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

// ランキング読み込み
useEffect(() => {
const saved = storage.get(‘pentaro-rankings’);
if (saved) setRankings(saved);
const savedHigh = storage.get(‘pentaro-highscore’);
if (savedHigh) setHighScore(savedHigh);
}, []);

// 物理演算ヘルパー
const getRadius = (stage) => PENTARO_STAGES[stage].size / 2 * 0.9;

// 物理演算メインループ
useEffect(() => {
const physicsStep = (timestamp) => {
if (gameOverRef.current) {
animationRef.current = requestAnimationFrame(physicsStep);
return;
}

```
  const delta = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 16.67, 2) : 1;
  lastTimeRef.current = timestamp;
  
  const balls = ballsRef.current;
  const now = Date.now();
  
  // 物理演算
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const radius = getRadius(ball.stage);
    
    // 重力
    ball.vy += GRAVITY * delta;
    
    // 速度制限
    const maxSpeed = 12;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }
    
    // 移動
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
    
    // 回転（床で転がる感じ）
    ball.rotation += ball.rotationSpeed * delta;
    ball.rotationSpeed *= 0.95;
    
    // 壁との衝突
    if (ball.x - radius < WALL_THICKNESS) {
      ball.x = WALL_THICKNESS + radius;
      ball.vx = Math.abs(ball.vx) * BOUNCE;
      ball.rotationSpeed += ball.vy * 0.02; // 壁で回転
    }
    if (ball.x + radius > CONTAINER_WIDTH - WALL_THICKNESS) {
      ball.x = CONTAINER_WIDTH - WALL_THICKNESS - radius;
      ball.vx = -Math.abs(ball.vx) * BOUNCE;
      ball.rotationSpeed -= ball.vy * 0.02; // 壁で回転
    }
    if (ball.y + radius > CONTAINER_HEIGHT - WALL_THICKNESS) {
      ball.y = CONTAINER_HEIGHT - WALL_THICKNESS - radius;
      ball.vy = -Math.abs(ball.vy) * BOUNCE;
      ball.vx *= FRICTION;
      // 床で転がる
      ball.rotationSpeed = ball.vx * 0.05;
      if (Math.abs(ball.vy) < 0.5) ball.vy = 0;
      if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
    }
  }
  
  // 衝突検出と解決
  const toRemove = new Set();
  const toAdd = [];
  
  for (let iteration = 0; iteration < 8; iteration++) {
    for (let i = 0; i < balls.length; i++) {
      if (toRemove.has(i)) continue;
      
      for (let j = i + 1; j < balls.length; j++) {
        if (toRemove.has(j)) continue;
        
        const b1 = balls[i];
        const b2 = balls[j];
        const r1 = getRadius(b1.stage);
        const r2 = getRadius(b2.stage);
        
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = r1 + r2;
        
        if (dist < minDist && dist > 0) {
          // 同じステージなら合体
          if (b1.stage === b2.stage && !toRemove.has(i) && !toRemove.has(j)) {
            const newX = (b1.x + b2.x) / 2;
            const newY = (b1.y + b2.y) / 2;
            
            // エンペラー同士は消滅
            if (b1.stage === PENTARO_STAGES.length - 1) {
              toRemove.add(i);
              toRemove.add(j);
              scoreQueueRef.current += 100;
              mergeQueueRef.current.push({ x: newX, y: newY, stage: b1.stage, isVanish: true });
            } else {
              // 通常合体
              toRemove.add(i);
              toRemove.add(j);
              const newStage = b1.stage + 1;
              toAdd.push({
                id: ballIdRef.current++,
                x: newX,
                y: newY,
                vx: (b1.vx + b2.vx) / 2,
                vy: Math.min((b1.vy + b2.vy) / 2 - 2, -1),
                stage: newStage,
                rotation: (b1.rotation + b2.rotation) / 2,
                rotationSpeed: (b1.rotationSpeed + b2.rotationSpeed) / 2,
                createdAt: now
              });
              scoreQueueRef.current += PENTARO_STAGES[newStage].score;
              mergeQueueRef.current.push({ x: newX, y: newY, stage: newStage, isVanish: false });
            }
          } else {
            // 衝突解決
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            
            const totalMass = r1 + r2;
            const ratio1 = r2 / totalMass;
            const ratio2 = r1 / totalMass;
            
            b1.x -= nx * overlap * ratio1;
            b1.y -= ny * overlap * ratio1;
            b2.x += nx * overlap * ratio2;
            b2.y += ny * overlap * ratio2;
            
            const dvx = b1.vx - b2.vx;
            const dvy = b1.vy - b2.vy;
            const dvn = dvx * nx + dvy * ny;
            
            if (dvn > 0) {
              b1.vx -= dvn * nx * ratio1 * 0.8;
              b1.vy -= dvn * ny * ratio1 * 0.8;
              b2.vx += dvn * nx * ratio2 * 0.8;
              b2.vy += dvn * ny * ratio2 * 0.8;
              
              // 衝突で回転（横からの衝撃で回る）
              b1.rotationSpeed += (b2.vx - b1.vx) * 0.02;
              b2.rotationSpeed += (b1.vx - b2.vx) * 0.02;
            }
          }
        }
      }
    }
  }
  
  // 削除と追加を適用
  if (toRemove.size > 0 || toAdd.length > 0) {
    ballsRef.current = balls.filter((_, i) => !toRemove.has(i)).concat(toAdd);
  }
  
  // スコアとエフェクトをUIに反映（バッチ処理）
  if (scoreQueueRef.current > 0) {
    const addScore = scoreQueueRef.current;
    scoreQueueRef.current = 0;
    setScore(prev => prev + addScore);
    setPunchChargeScore(prev => {
      const newCharge = prev + addScore;
      if (newCharge >= PUNCH_COST) setPunchReady(true);
      return newCharge;
    });
  }
  
  if (mergeQueueRef.current.length > 0) {
    const effects = mergeQueueRef.current.map(e => ({ ...e, id: Date.now() + Math.random() }));
    mergeQueueRef.current = [];
    setMergeEffects(prev => [...prev, ...effects]);
  }
  
  // ゲームオーバー判定
  for (const ball of ballsRef.current) {
    const radius = getRadius(ball.stage);
    const isAboveLine = ball.y - radius < GAME_OVER_LINE;
    const isSettled = Math.abs(ball.vy) < 1 && Math.abs(ball.vx) < 1;
    const isOldEnough = now - ball.createdAt > 2000;
    
    if (isAboveLine && isSettled && isOldEnough) {
      gameOverRef.current = true;
      setGameOver(true);
      setShowNameInput(true);
      if (scoreRef.current > (storage.get('pentaro-highscore') || 0)) {
        storage.set('pentaro-highscore', scoreRef.current);
        setHighScore(scoreRef.current);
      }
      break;
    }
  }
  
  // 描画更新（30fpsに制限してパフォーマンス向上）
  setRenderTrigger(prev => prev + 1);
  
  animationRef.current = requestAnimationFrame(physicsStep);
};

animationRef.current = requestAnimationFrame(physicsStep);

return () => {
  if (animationRef.current) cancelAnimationFrame(animationRef.current);
};
```

}, []);

// 次のぺんたろうを生成
const getNextPentaro = useCallback(() => Math.floor(Math.random() * 4), []);

useEffect(() => { setNextStage(getNextPentaro()); }, [getNextPentaro]);

// ボールを落とす
const dropBall = useCallback(() => {
if (gameOver || !canDropRef.current) return;

```
if (!gameStarted) setGameStarted(true);

canDropRef.current = false;
const stage = nextStage;
const radius = getRadius(stage);

ballsRef.current.push({
  id: ballIdRef.current++,
  x: dropX,
  y: DROP_Y + radius,
  vx: 0,
  vy: 0,
  stage,
  rotation: 0,
  rotationSpeed: 0, // 落下時は回転なし、衝突で回転する
  createdAt: Date.now()
});

setNextStage(getNextPentaro());
setTimeout(() => { canDropRef.current = true; }, 400);
```

}, [dropX, nextStage, gameOver, gameStarted, getNextPentaro]);

// 移動ハンドラ
const handleMove = useCallback((clientX) => {
if (!containerRef.current || gameOver) return;
const rect = containerRef.current.getBoundingClientRect();
const x = clientX - rect.left;
setDropX(Math.max(50, Math.min(CONTAINER_WIDTH - 50, x)));
}, [gameOver]);

// みゆちゃんパンチ
const doMiyuPunch = useCallback(() => {
if (!punchReady || gameOver || !gameStarted) return;

```
setPunchReady(false);
setPunchChargeScore(prev => {
  const newCharge = prev - PUNCH_COST;
  if (newCharge >= PUNCH_COST) setPunchReady(true);
  return newCharge;
});
setIsShaking(true);
setShowPunchEffect(true);

// 全てのボールを揺らす
for (const ball of ballsRef.current) {
  ball.vx += (Math.random() - 0.5) * 15;
  ball.vy -= Math.random() * 8 + 3;
  ball.rotationSpeed += (Math.random() - 0.5) * 8;
}

setTimeout(() => setIsShaking(false), 500);
setTimeout(() => setShowPunchEffect(false), 800);
```

}, [punchReady, gameOver, gameStarted]);

// リスタート
const restart = useCallback(() => {
ballsRef.current = [];
setScore(0);
scoreRef.current = 0;
setGameOver(false);
gameOverRef.current = false;
setGameStarted(false);
setNextStage(getNextPentaro());
setDropX(CONTAINER_WIDTH / 2);
canDropRef.current = true;
setPunchReady(false);
setPunchChargeScore(0);
setMergeEffects([]);
}, [getNextPentaro]);

// スコア保存
const saveScore = () => {
const name = playerName.trim() || ‘ななし’;
const newRankings = […rankings, { name, score, date: Date.now() }]
.sort((a, b) => b.score - a.score)
.slice(0, 10);
setRankings(newRankings);
storage.set(‘pentaro-rankings’, newRankings);
setShowNameInput(false);
setPlayerName(’’);
};

const skipSave = () => { setShowNameInput(false); setPlayerName(’’); };

// エフェクトクリーンアップ
useEffect(() => {
if (mergeEffects.length > 0) {
const timer = setTimeout(() => setMergeEffects(prev => prev.slice(1)), 600);
return () => clearTimeout(timer);
}
}, [mergeEffects]);

// 現在のボール状態を取得
const currentBalls = ballsRef.current;

return (
<div className="min-h-screen bg-gradient-to-b from-sky-200 to-sky-400 flex flex-col items-center justify-center p-4">
<style>{shakeStyle}</style>
<h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">🐧 ぺんたろうゲーム 🐧</h1>

```
  <div className="flex gap-4 mb-3">
    <div className="bg-white/80 rounded-lg px-4 py-2 shadow">
      <span className="text-gray-600 text-sm">スコア</span>
      <p className="text-2xl font-bold text-blue-600">{score}</p>
    </div>
    <div className="bg-white/80 rounded-lg px-4 py-2 shadow">
      <span className="text-gray-600 text-sm">ハイスコア</span>
      <p className="text-2xl font-bold text-purple-600">{highScore}</p>
    </div>
  </div>
  
  {/* みゆちゃんパンチ */}
  <div className="mb-2 flex items-center gap-2">
    <button
      onClick={doMiyuPunch}
      disabled={!punchReady || gameOver}
      className={`px-4 py-2 rounded-full font-bold text-white shadow-lg transition-all transform
        ${punchReady && !gameOver
          ? 'bg-gradient-to-r from-pink-400 to-pink-500 hover:scale-105 active:scale-95 animate-pulse'
          : 'bg-gray-400 cursor-not-allowed'}`}
    >
      👊 みゆちゃんパンチ！
    </button>
    <div className="bg-white/80 rounded-full px-3 py-1 text-xs">
      <span className="text-gray-500">チャージ: </span>
      <span className={`font-bold ${punchChargeScore >= PUNCH_COST ? 'text-pink-500' : 'text-gray-600'}`}>
        {Math.min(punchChargeScore, PUNCH_COST)}/{PUNCH_COST}
      </span>
    </div>
  </div>
  
  {/* 次のぺんたろう */}
  <div className="bg-white/80 rounded-lg px-4 py-2 mb-2 shadow flex items-center gap-2">
    <span className="text-gray-600 text-sm">次:</span>
    <svg width="50" height="50" viewBox="-25 -25 50 50">
      <Pentaro x={0} y={0} stage={nextStage} />
    </svg>
    <span className="text-sm font-medium">{PENTARO_STAGES[nextStage].name}</span>
  </div>
  
  {/* ゲームコンテナ */}
  <div 
    ref={containerRef}
    className={`relative bg-sky-100 rounded-lg shadow-xl cursor-pointer select-none overflow-hidden ${isShaking ? 'animate-shake' : ''}`}
    style={{ width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT, touchAction: 'none' }}
    onMouseMove={(e) => handleMove(e.clientX)}
    onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0]?.clientX); }}
    onClick={dropBall}
    onTouchEnd={(e) => { e.preventDefault(); dropBall(); }}
  >
    {showPunchEffect && (
      <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
        <div className="text-6xl animate-bounce">👊💥</div>
      </div>
    )}
    
    <svg width={CONTAINER_WIDTH} height={CONTAINER_HEIGHT}>
      {/* 壁 */}
      <rect x="0" y="50" width={WALL_THICKNESS} height={CONTAINER_HEIGHT - 50} fill="#8B4513" rx="2" />
      <rect x={CONTAINER_WIDTH - WALL_THICKNESS} y="50" width={WALL_THICKNESS} height={CONTAINER_HEIGHT - 50} fill="#8B4513" rx="2" />
      <rect x="0" y={CONTAINER_HEIGHT - WALL_THICKNESS} width={CONTAINER_WIDTH} height={WALL_THICKNESS} fill="#8B4513" rx="2" />
      
      {/* ゲームオーバーライン */}
      <line x1={WALL_THICKNESS} y1={GAME_OVER_LINE} x2={CONTAINER_WIDTH - WALL_THICKNESS} y2={GAME_OVER_LINE}
        stroke="red" strokeWidth="2" strokeDasharray="10,5" opacity="0.5" />
      
      {/* ドロップガイド */}
      {!gameOver && (
        <>
          <line x1={dropX} y1={DROP_Y} x2={dropX} y2={CONTAINER_HEIGHT - WALL_THICKNESS}
            stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="5,5" />
          <g transform={`translate(${dropX}, ${DROP_Y})`}>
            <Pentaro x={0} y={0} stage={nextStage} />
          </g>
        </>
      )}
      
      {/* ボール */}
      {currentBalls.map(ball => (
        <Pentaro key={ball.id} x={ball.x} y={ball.y} stage={ball.stage} rotation={ball.rotation} />
      ))}
      
      {/* エフェクト */}
      {mergeEffects.map(effect => (
        <g key={effect.id}>
          {effect.isVanish ? (
            <>
              <circle cx={effect.x} cy={effect.y} r={PENTARO_STAGES[effect.stage].size / 2}
                fill="none" stroke="#FF69B4" strokeWidth="4">
                <animate attributeName="r" from={PENTARO_STAGES[effect.stage].size / 2} to={PENTARO_STAGES[effect.stage].size} dur="0.6s" />
                <animate attributeName="opacity" from="1" to="0" dur="0.6s" />
              </circle>
              <text x={effect.x} y={effect.y} textAnchor="middle" fill="#FF69B4" fontSize="20" fontWeight="bold">
                +100
                <animate attributeName="y" from={effect.y} to={effect.y - 50} dur="0.6s" />
                <animate attributeName="opacity" from="1" to="0" dur="0.6s" />
              </text>
            </>
          ) : (
            <>
              <circle cx={effect.x} cy={effect.y} r={PENTARO_STAGES[effect.stage].size / 2 + 10}
                fill="none" stroke="#FFD700" strokeWidth="3" opacity="0.8">
                <animate attributeName="r" from={PENTARO_STAGES[effect.stage].size / 2} to={PENTARO_STAGES[effect.stage].size / 2 + 30} dur="0.5s" />
                <animate attributeName="opacity" from="0.8" to="0" dur="0.5s" />
              </circle>
              <text x={effect.x} y={effect.y - PENTARO_STAGES[effect.stage].size / 2 - 10}
                textAnchor="middle" fill="#FFD700" fontSize="14" fontWeight="bold">
                +{PENTARO_STAGES[effect.stage].score}
                <animate attributeName="y" from={effect.y - PENTARO_STAGES[effect.stage].size / 2 - 10} to={effect.y - PENTARO_STAGES[effect.stage].size / 2 - 40} dur="0.5s" />
                <animate attributeName="opacity" from="1" to="0" dur="0.5s" />
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
    
    {/* ゲームオーバー */}
    {gameOver && !showNameInput && (
      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg z-10">
        <p className="text-white text-3xl font-bold mb-2">ゲームオーバー</p>
        <p className="text-yellow-300 text-xl mb-4">スコア: {score}</p>
        <button onClick={(e) => { e.stopPropagation(); restart(); }}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition text-lg">
          もう一度遊ぶ
        </button>
      </div>
    )}
    
    {!gameStarted && !gameOver && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <p className="text-white text-xl font-bold bg-black/30 px-4 py-2 rounded-lg">タップして開始！</p>
      </div>
    )}
  </div>
  
  <p className="text-white/80 text-sm mt-3">タップでぺんたろうを落とそう！</p>
  
  {/* 図鑑 */}
  <div className="mt-4 bg-white/80 rounded-lg p-3 shadow max-w-md">
    <p className="text-center font-bold text-gray-700 mb-2">🎀 ぺんたろう図鑑</p>
    <div className="flex flex-wrap justify-center gap-3">
      {PENTARO_STAGES.map((stage, i) => {
        const viewSize = 60 + i * 15;
        return (
          <div key={i} className="flex flex-col items-center text-xs">
            <svg width="55" height="70" viewBox={`${-viewSize} ${-viewSize} ${viewSize * 2} ${viewSize * 2.2}`}>
              <Pentaro x={0} y={0} stage={i} />
            </svg>
            <span className="text-gray-600 mt-1">{stage.name}</span>
          </div>
        );
      })}
    </div>
  </div>
  
  {/* ランキング */}
  {rankings.length > 0 && (
    <div className="mt-4 bg-white/80 rounded-lg p-3 shadow w-72">
      <p className="text-center font-bold text-gray-700 mb-2">🏆 ランキング</p>
      <div className="space-y-1">
        {rankings.slice(0, 5).map((record, i) => (
          <div key={i} className="flex justify-between items-center text-sm px-2 py-1 bg-white/50 rounded">
            <span className="font-bold text-gray-500">{i + 1}.</span>
            <span className="flex-1 ml-2 truncate">{record.name}</span>
            <span className="font-bold text-blue-600">{record.score}</span>
          </div>
        ))}
      </div>
    </div>
  )}
  
  {/* 名前入力 */}
  {showNameInput && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={e => e.stopPropagation()}>
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <p className="text-xl font-bold text-center text-gray-700 mb-2">🎉 ゲームオーバー！</p>
        <p className="text-center text-2xl font-bold text-blue-600 mb-4">スコア: {score}</p>
        <p className="text-gray-600 mb-2">名前を入力してランキングに登録：</p>
        <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
          placeholder="なまえ" maxLength={10}
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 text-lg mb-4 focus:border-blue-500 focus:outline-none"
          autoFocus onClick={e => e.stopPropagation()} />
        <div className="flex gap-2">
          <button onClick={saveScore}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition">
            登録する
          </button>
          <button onClick={skipSave}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg transition">
            スキップ
          </button>
        </div>
        <button onClick={() => { skipSave(); restart(); }}
          className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
          もう一度遊ぶ
        </button>
      </div>
    </div>
  )}
</div>
```

);
}
