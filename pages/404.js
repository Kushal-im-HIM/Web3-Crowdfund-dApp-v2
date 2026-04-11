/**
 * pages/404.js
 *
 * FIX Issue 2 — Invalid Route Handling:
 *   Any URL that does not match a valid Next.js page renders this 404 component.
 *   It auto-redirects to the homepage (index.js / landing page) after 3 seconds,
 *   and also provides an instant "Go Home" button for impatient users.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiHome, FiAlertTriangle } from "react-icons/fi";

export default function NotFoundPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace("/");
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-primary-900 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <FiAlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <h1 className="text-6xl font-extrabold text-gray-900 dark:text-white mb-2">
          404
        </h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Page Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          You&apos;ll be redirected to the homepage in{" "}
          <span className="font-bold text-secondary-600 dark:text-secondary-400">
            {countdown}
          </span>{" "}
          second{countdown !== 1 ? "s" : ""}.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-secondary-600 hover:bg-secondary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          <FiHome className="w-4 h-4" />
          Go to Homepage
        </Link>

        {/* Countdown ring */}
        <div className="mt-8 flex justify-center">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-200 dark:text-primary-700"
            />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${((3 - countdown) / 3) * 100} 100`}
              className="text-secondary-500 transition-all duration-1000"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
