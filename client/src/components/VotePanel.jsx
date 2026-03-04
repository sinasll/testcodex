export default function VotePanel({ livingPlayers, votes, onVote }) {
  const counts = Object.values(votes || {}).reduce((acc, id) => {
    if (!id) return acc;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-zinc-700 p-3">
      <h3 className="font-semibold">Voting</h3>
      <ul className="space-y-2 mt-2">
        {livingPlayers.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span>{p.name} ({counts[p.id] || 0})</span>
            <button className="px-3 py-2 rounded bg-zinc-200 text-zinc-900" onClick={() => onVote(p.id)}>Vote</button>
          </li>
        ))}
      </ul>
      <button className="mt-3 px-3 py-2 rounded border" onClick={() => onVote(null)}>Clear vote</button>
    </div>
  );
}
