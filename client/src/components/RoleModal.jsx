export default function RoleModal({ role, open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-700 p-5">
        <h2 className="text-xl font-bold">Your Role</h2>
        <p className="mt-2 text-lg">{role || 'Waiting...'}</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-white text-black rounded">Understood</button>
      </div>
    </div>
  );
}
