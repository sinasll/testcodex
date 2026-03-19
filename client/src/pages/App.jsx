import { useEffect, useMemo, useState } from 'react';
import TimerBar from '../components/TimerBar';
import VotePanel from '../components/VotePanel';
import RoleModal from '../components/RoleModal';
import { useSocket } from '../hooks/useSocket';
import { detectTelegramUser } from '../lib/telegram';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function App() {
  const telegramUser = useMemo(() => detectTelegramUser(), []);
  const [name, setName] = useState(telegramUser?.name || '');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [lobbyId, setLobbyId] = useState(localStorage.getItem('lobbyId') || '');
  const [state, setState] = useState(null);
  const [will, setWill] = useState('');
  const [showRole, setShowRole] = useState(true);
  const { socket, connected } = useSocket(token);

  useEffect(() => {
    if (!socket) return;
    socket.on('game:state', setState);
    socket.on('connect', () => {
      socket.emit('lobby:join', { name, telegramId: telegramUser?.id || null });
    });
    socket.on('night:result', (entries) => console.log('night', entries));
    return () => socket.off('game:state', setState);
  }, [socket, name, telegramUser]);

  async function createLobby() {
    const res = await fetch(`${API}/api/lobbies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setToken(data.token);
    setLobbyId(data.lobbyId);
    localStorage.setItem('token', data.token);
    localStorage.setItem('lobbyId', data.lobbyId);
  }

  const livingPlayers = state?.players?.filter((p) => p.alive) || [];

  return (
    <main className="max-w-4xl mx-auto p-3 space-y-3">
      <header className="rounded-xl border border-zinc-700 p-3 flex justify-between items-center">
        <h1 className="font-bold text-xl">Mafia Mini App</h1>
        <span className={`text-sm ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>{connected ? 'Connected' : 'Reconnecting...'}</span>
      </header>

      {!token && (
        <section className="rounded-xl border border-zinc-700 p-3 space-y-2">
          <p>{telegramUser ? `Telegram detected: ${telegramUser.name}` : 'Guest mode'}</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="w-full px-3 py-2 rounded bg-zinc-800" />
          <button onClick={createLobby} className="px-4 py-3 rounded bg-white text-black w-full">Create Lobby</button>
        </section>
      )}

      {state && (
        <>
          <section className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-700 p-3">
              <p>Lobby: {lobbyId}</p>
              <p>Phase: {state.phase}</p>
              <p>Day: {state.dayNumber}</p>
              <button className="mt-2 px-3 py-2 border rounded" onClick={() => socket.emit('game:start')}>Host: Start game</button>
            </div>
            <div className="rounded-xl border border-zinc-700 p-3 space-y-2">
              <TimerBar label="Night" secondsLeft={60} total={60} />
              <TimerBar label="Day" secondsLeft={300} total={300} />
              <TimerBar label="Voting" secondsLeft={90} total={90} />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-700 p-3">
            <h2 className="font-semibold">Players</h2>
            <ul className="mt-2 grid sm:grid-cols-2 gap-2">
              {state.players.map((p) => (
                <li key={p.id} className="p-2 rounded bg-zinc-800 flex justify-between">
                  <span>{p.name}</span><span>{p.alive ? 'Alive' : 'Dead'}</span>
                </li>
              ))}
            </ul>
          </section>

          <VotePanel livingPlayers={livingPlayers} votes={state.votes || {}} onVote={(targetId) => socket.emit('vote:cast', { targetId })} />

          <section className="rounded-xl border border-zinc-700 p-3">
            <h3 className="font-semibold">Last Will</h3>
            <textarea value={will} onChange={(e) => { setWill(e.target.value); socket.emit('will:update', { text: e.target.value }); }} className="w-full min-h-24 bg-zinc-800 rounded p-2 mt-2" />
          </section>
        </>
      )}

      <RoleModal role={state?.myRole} open={showRole && !!state?.myRole} onClose={() => setShowRole(false)} />
    </main>
  );
}
