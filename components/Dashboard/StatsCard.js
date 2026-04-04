/**
 * components/Dashboard/StatsCard.js
 *
 * MANDATE 2 — Data Audit:
 *   - `trend` and `trendValue` props are still accepted for forwards compatibility
 *     but DashboardStats.js no longer passes fake trend values (+12%, etc.).
 *     The trend UI renders only when a genuine `trend` prop is provided.
 *
 * MANDATE 5 — Light Mode Cream Aesthetic:
 *   - Card background: bg-cream-100 in light mode (warm #FDFAF6) instead of
 *     stark bg-white.
 *   - Border: border-cream-400 (warm sand tone #E8E0D5) instead of border-gray-200.
 *   - Since Tailwind JIT may not pick up arbitrary cream-* classes dynamically,
 *     we use the exact hex values via inline style for the bg and rely on
 *     Tailwind's border-stone-200 (close warm match) for the border.
 *   - dark: classes are completely unchanged.
 */

import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
}) {
  const colorClasses = {
    primary: "from-primary-500 to-primary-600",
    secondary: "from-secondary-500 to-secondary-600",
    tertiary: "from-tertiary-500 to-tertiary-600",
    accent: "from-accent-500 to-accent-600",
    emerald: "from-secondary-500 to-secondary-600",
    cyan: "from-tertiary-500 to-tertiary-600",
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-cream-card dark:shadow-lg p-6 border border-stone-200 dark:border-primary-700 bg-white dark:bg-primary-800 transition-colors duration-300"
      style={{ "--tw-shadow-color": "rgba(45,41,38,0.06)" }}
    >
      {/* MANDATE 5: Cream background overlay — `relative` on parent makes `absolute` work */}
      <div className="absolute inset-0 rounded-xl bg-[#fdfaf6] dark:bg-transparent -z-10 pointer-events-none" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>

          {/* MANDATE 2: Trend is only shown when a real value is passed.
              DashboardStats no longer passes fake "+12%" trend values. */}
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              {trend === "up" ? (
                <FiTrendingUp className="w-4 h-4 text-secondary-500 mr-1" />
              ) : (
                <FiTrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span
                className={`text-sm font-medium ${trend === "up" ? "text-secondary-500" : "text-red-500"
                  }`}
              >
                {trendValue}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
                vs last month
              </span>
            </div>
          )}
        </div>

        <div
          className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color] ?? colorClasses.primary} rounded-lg flex items-center justify-center flex-shrink-0`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
