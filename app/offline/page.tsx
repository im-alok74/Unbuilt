export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-canvas px-8 text-center">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">You&apos;re offline</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reconnect and this page will reload. Anything you saved on a lead is kept and will sync automatically.
        </p>
      </div>
    </div>
  );
}
