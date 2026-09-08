import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-white px-6 text-center">
      <div>
        <p className="text-sm text-gray-400">This page doesn&apos;t exist.</p>
        <Link href="/map" className="mt-3 inline-block text-sm text-accent hover:underline">
          Back to the map
        </Link>
      </div>
    </div>
  );
}
