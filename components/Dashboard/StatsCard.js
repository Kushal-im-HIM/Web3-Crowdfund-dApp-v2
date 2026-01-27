import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "blue",
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    pink: "from-pink-500 to-pink-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>

          {trend && (
            <div className="flex items-center mt-2">
              {trend === "up" ? (
                <FiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <FiTrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend === "up" ? "text-green-500" : "text-red-500"
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
          className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-lg flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
