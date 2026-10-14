import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Pause, Play, Volume2 } from 'lucide-react';
import { formatDuration } from '../lib/normalizeCall';

const BARS = [14, 26, 18, 36, 22, 48, 29, 17, 41, 25, 53, 19, 31, 45, 24, 38, 16, 50, 28, 42, 20, 34, 54, 25, 17, 39, 23, 46, 30, 18, 50, 27, 37, 20, 43, 25, 55, 31, 17, 40, 24, 49, 19, 34, 44, 21, 38, 16, 47, 28, 36, 19, 52, 24, 41, 17, 33, 48, 26, 39, 20, 45, 29, 36];

export default function AudioPlayer({ src, durationSeconds, customerName, isSyntheticDemo = true }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [volume, setVolume] = useState(0.85);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPlaying(false); setCurrent(0); setFailed(false); setDuration(durationSeconds || 0);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, [src, durationSeconds]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [src, volume]);

  const toggle = async () => {
    if (!audioRef.current || failed) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { try { await audioRef.current.play(); setPlaying(true); } catch { setFailed(true); setPlaying(false); } }
  };
  const seek = (event) => {
    const value = Number(event.target.value);
    if (audioRef.current && Number.isFinite(value)) { audioRef.current.currentTime = value; setCurrent(value); }
  };
  const changeVolume = (event) => {
    const value = Number(event.target.value);
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  };
  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <section className="audio-card" aria-label="Call recording">
      {src && <audio ref={audioRef} src={src} preload="metadata" onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || durationSeconds || 0)} onEnded={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }} />}
      <div className="audio-head"><div><span className="eyebrow">RECORDING</span><h3>{customerName || 'Call audio'}</h3></div><span className={`audio-live ${playing ? 'is-playing' : ''}`}><i />{playing ? 'Playing' : 'Audio'}</span></div>
      {src ? <>
        <div className={`waveform ${playing ? 'wave-playing' : ''}`} role="img" aria-label={`Playback progress, ${Math.round(progress)} percent`}>
          {BARS.map((height, index) => <i key={index} className={index / BARS.length * 100 <= progress ? 'played' : ''} style={{ height: `${height}%` }} />)}
        </div>
        <div className="audio-seek-row"><span>{formatDuration(current)}</span><input className="range seek-range" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(current, duration || current)} onChange={seek} aria-label="Seek audio" style={{ '--range-progress': `${progress}%` }} /><span>{formatDuration(duration || durationSeconds)}</span></div>
        <div className="audio-controls"><button className="play-button" onClick={toggle} aria-label={playing ? 'Pause audio' : 'Play audio'} title={playing ? 'Pause recording' : 'Play recording'} disabled={failed}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><span className="audio-caption">{failed ? 'Recording unavailable' : isSyntheticDemo ? 'Synthetic demo recording' : 'Recorded call · original audio'}</span><div className="volume-control"><Volume2 size={16} aria-hidden="true" /><input className="range volume-range" type="range" min="0" max="1" step="0.05" value={volume} onChange={changeVolume} aria-label="Audio volume" style={{ '--range-progress': `${volume * 100}%` }} /></div></div>
        {failed && <div className="audio-error" role="alert"><AlertCircle size={14} />The recording could not be played. Check the backend’s verified audio URL and CORS headers.</div>}
      </> : <div className="audio-unavailable"><div className="waveform waveform-muted">{BARS.slice(0, 36).map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><p><AlertCircle size={15} />No audio URL was returned by the backend for this call.</p><small>Audio playback is enabled only for recordings served at a verified backend URL.</small></div>}
    </section>
  );
}
