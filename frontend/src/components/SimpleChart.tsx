import React from 'react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: ChartData[];
  title: string;
  height?: number;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
  data, 
  title, 
  height = 200 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <span className="text-blue-600 text-lg">📊</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">Performans görünümü</p>
        </div>
      </div>
      
      <div className="space-y-4" style={{ height }}>
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const color = item.color || colors[index % colors.length];
          
          return (
            <div key={item.label} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="w-full sm:w-20 text-sm text-gray-600 font-medium truncate">
                {item.label}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                    minWidth: item.value > 0 ? '20px' : '0px'
                  }}
                >
                  {percentage > 15 && (
                    <span className="text-white text-xs font-medium">
                      {item.value.toLocaleString('tr-TR')}
                    </span>
                  )}
                </div>
                {percentage <= 15 && item.value > 0 && (
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-700 text-xs font-medium">
                    {item.value.toLocaleString('tr-TR')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SimpleLineChartProps {
  data: ChartData[];
  title: string;
  height?: number;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ 
  data, 
  title, 
  height = 200 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = range > 0 ? ((maxValue - item.value) / range) * 80 + 10 : 50;
    return { x, y, value: item.value, label: item.label };
  });

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <span className="text-green-600 text-lg">📈</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">Trend analizi</p>
        </div>
      </div>
      
      <div className="relative" style={{ height }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          className="overflow-visible"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="currentColor"
              className="text-slate-200"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Area under curve */}
          <path
            d={`${pathData} L 100 90 L 0 90 Z`}
            fill="url(#gradient)"
            opacity="0.3"
          />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="2"
                className="hover:r-4 transition-all cursor-pointer"
              />
              <title>{`${point.label}: ${point.value.toLocaleString('tr-TR')}`}</title>
            </g>
          ))}
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2 overflow-hidden">
          {data.map((item, index) => (
            <span key={index} className="transform -rotate-45 origin-bottom-left truncate max-w-[60px] sm:max-w-none">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};