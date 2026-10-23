import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Pet } from '../energy/core/types';
import { PetPicker } from '../energy/ui/components/Pickers';
import { TopBar } from '../energy/ui/components/TopBar';
import { PetRig, RIGS, regionAt, type Region } from './PetRig';
import { companionCopy as copy } from './copy';
import { useCompanionMood, type Touch } from './useCompanionMood';
import { usePurr } from './usePurr';
import './companion.css';

const ROOM_W = 600;
const ROOM_H = 800;
const LEAN: Record<Exclude<Region, null>, number> = { head: 0, cheekLeft: -6, cheekRight: 6, body: 0 };
const TOUCH: Record<Exclude<Region, null>, Touch> = { head: 'head', cheekLeft: 'cheek', cheekRight: 'cheek', body: 'body' };
const SPARK_MS = 1_500;
const MAX_SPARKS = 8;
interface Spark { id: number; x: number; y: number; drift: number; big: boolean }

// 小小的愛心形狀，中心在 (0,0)
const HEART = 'M0 6 C -9 -1 -9 -9 -4 -10 C -1 -10.5 0 -8 0 -6.5 C 0 -8 1 -10.5 4 -10 C 9 -9 9 -1 0 6 Z';

// 萌寵陪伴屋：沒有餵食、沒有生病、沒有每日登入；不操作時萌寵也會安靜地待著。
export function CompanionScreen({ pet = 'cat', onPetChange, soundEnabled, volume, reducedMotion, onOpenSettings, random }: {
  pet?: Pet; onPetChange?: (pet: Pet) => void; soundEnabled: boolean; volume: number; reducedMotion: boolean; onOpenSettings: () => void; random?: () => number;
}) {
  const { mood, action, blink, lean, reaction, delight, pet: petOnce, rest, wake } = useCompanionMood(random);
  const purr = usePurr(soundEnabled, volume, pet === 'dog' ? 'pant' : 'purr');
  const headX = RIGS[pet].x + RIGS[pet].headArea.cx;
  const roomRef = useRef<SVGSVGElement>(null);
  const strokeRef = useRef<{ pointerId: number; last: number } | null>(null);
  const rand = random ?? Math.random;

  // 摸到的位置冒出淡淡的愛心與漣漪，一會兒就消失；同時最多幾顆，不會越積越多。
  const [sparks, setSparks] = useState<Spark[]>([]);
  const sparkId = useRef(0);
  const sparkTimers = useRef(new Set<number>());
  useEffect(() => () => { sparkTimers.current.forEach(t => window.clearTimeout(t)); }, []);
  const addSpark = (x: number, y: number, big: boolean) => {
    const id = ++sparkId.current;
    setSparks(list => [...list.slice(-(MAX_SPARKS - 1)), { id, x, y, drift: (rand() - 0.5) * 30, big }]);
    const timer = window.setTimeout(() => {
      sparkTimers.current.delete(timer);
      setSparks(list => list.filter(s => s.id !== id));
    }, SPARK_MS);
    sparkTimers.current.add(timer);
  };

  useEffect(() => { if (mood !== 'happy') purr.stop(); }, [mood, purr]);

  const toRoom = (event: ReactPointerEvent) => {
    const rect = roomRef.current!.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) * ROOM_W) / (rect.width || ROOM_W), y: ((event.clientY - rect.top) * ROOM_H) / (rect.height || ROOM_H) };
  };
  const touch = (region: Exclude<Region, null>, x = headX, y = RIGS[pet].y + RIGS[pet].headArea.cy - 40) => {
    const towards = region === 'head' ? (x - headX) / 25 : LEAN[region];
    if (!petOnce(towards, TOUCH[region])) return; // 睡著時只是被輕輕叫醒
    addSpark(x, y, delight);
    purr.start();
  };

  // 在頭上滑動就是摸摸；一次只跟隨一根手指，約每 300ms 更新一次。
  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (strokeRef.current) return;
    const p = toRoom(event);
    const region = regionAt(p.x, p.y, pet);
    if (!region) return;
    strokeRef.current = { pointerId: event.pointerId, last: Date.now() };
    roomRef.current?.setPointerCapture?.(event.pointerId);
    // 支援的手機上輕輕震一下（減少動態時不震）
    if (!reducedMotion) navigator.vibrate?.(8);
    touch(region, p.x, p.y);
  }
  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId || Date.now() - stroke.last < 300) return;
    const p = toRoom(event);
    const region = regionAt(p.x, p.y, pet);
    if (!region) return;
    stroke.last = Date.now();
    touch(region, p.x, p.y);
  }
  // 手指離開或手勢被取消時，聲音立刻淡出（萌寵仍會瞇眼一下再回到平常）。
  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (strokeRef.current?.pointerId !== event.pointerId) return;
    strokeRef.current = null;
    purr.stop();
  }

  const sleeping = mood === 'sleep';
  return (
    <div className="screen feature companion">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className="sr-only">{copy.title}</h1>
      <svg ref={roomRef} className={`companion-room${reducedMotion ? ' companion-room--still' : ''}`} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}
        role="img" aria-label={delight ? copy.delight[pet] : copy.state[pet][mood]}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <defs>
          <linearGradient id="room-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3e9de" /><stop offset="1" stopColor="#e9d9c8" /></linearGradient>
          <linearGradient id="room-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8c2a5" /><stop offset="1" stopColor="#c9ae8d" /></linearGradient>
          <linearGradient id="room-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfe0ef" /><stop offset="1" stopColor="#eef4f8" /></linearGradient>
          <radialGradient id="room-cushion" cx="45%" cy="40%"><stop offset="0" stopColor="#c9d6e8" /><stop offset="1" stopColor="#8fa3c0" /></radialGradient>
          <radialGradient id="room-light" cx="50%" cy="0%" r="90%"><stop offset="0" stopColor="#fff8ec" stopOpacity="0.7" /><stop offset="1" stopColor="#fff8ec" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width={ROOM_W} height="560" fill="url(#room-wall)" />
        {/* 窗戶與窗簾 */}
        <rect x="350" y="70" width="190" height="230" rx="14" fill="url(#room-sky)" stroke="#c6b29b" strokeWidth="8" />
        <line x1="445" y1="70" x2="445" y2="300" stroke="#c6b29b" strokeWidth="5" />
        <line x1="350" y1="185" x2="540" y2="185" stroke="#c6b29b" strokeWidth="5" />
        {sleeping && <circle cx="500" cy="115" r="18" fill="#fdf4d8" opacity="0.9" />}
        <path d="M335 60 Q 360 190 345 315 L 372 315 Q 382 190 368 60 Z" fill="#e9d5d1" opacity="0.9" />
        <path d="M555 60 Q 530 190 545 315 L 518 315 Q 508 190 522 60 Z" fill="#e9d5d1" opacity="0.9" />
        {/* 牆上的小畫與植物 */}
        <rect x="70" y="110" width="120" height="90" rx="6" fill="#f8f2ea" stroke="#c6b29b" strokeWidth="6" />
        <path d="M82 190 Q 110 140 130 165 Q 150 130 178 190 Z" fill="#a8b7cc" />
        <rect y="550" width={ROOM_W} height="250" fill="url(#room-floor)" />
        <rect y="546" width={ROOM_W} height="10" fill="#bfa383" />
        <ellipse cx="300" cy="720" rx="250" ry="62" fill="#e5d6c2" opacity="0.8" />
        <ellipse cx="300" cy="745" rx="205" ry="40" fill="rgba(60,40,20,0.16)" />
        <ellipse cx="300" cy="728" rx="200" ry="42" fill="url(#room-cushion)" />
        <ellipse cx="290" cy="716" rx="150" ry="22" fill="#d6e0ee" opacity="0.6" />
        <rect width={ROOM_W} height="560" fill="url(#room-light)" pointerEvents="none" />

        <PetRig pet={pet} mood={mood} action={action} blink={blink} lean={lean} reaction={reaction} delight={delight} />

        <g className="companion-sparks" pointerEvents="none" aria-hidden="true">
          {sparks.map(s => (
            <g key={s.id} transform={`translate(${s.x} ${s.y})`}>
              <circle className="spark-ripple" r="14" />
              <g className="spark-heart" style={{ ['--drift' as string]: `${s.drift}px` }}>
                <path d={HEART} transform={s.big ? 'scale(2.1)' : 'scale(1.6)'} />
              </g>
            </g>
          ))}
        </g>

        {sleeping && (
          <g className="companion-zzz" aria-hidden="true">
            <text x="430" y="360">z</text><text x="455" y="330" className="z2">z</text><text x="482" y="298" className="z3">Z</text>
          </g>
        )}
        <rect className="companion-night" width={ROOM_W} height={ROOM_H} fill="#1d2a4a" opacity={sleeping ? 0.32 : 0} pointerEvents="none" />
      </svg>
      <p className="muted small companion-hint">{copy.hint[pet]}</p>
      {onPetChange && <PetPicker value={pet} update={partial => { if (partial.pet) onPetChange(partial.pet); }} />}

      <div className="controls">
        <button type="button" className="btn" onClick={() => touch('head')}>{copy.petHead}</button>
        <button type="button" className="btn" onClick={() => touch('cheekRight')}>{copy.petCheek}</button>
        {sleeping
          ? <button type="button" className="btn btn--primary" onClick={wake}>{copy.wake}</button>
          : <button type="button" className="btn btn--primary" onClick={rest}>{copy.rest}</button>}
      </div>
      <p className="muted small">{copy.note}</p>
    </div>
  );
}
