import React from 'react';
import clsx from 'clsx';

export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Sparkline Component
 * Mini trend chart for dashboard cards
 */
export function Sparkline({
  data,
  color = '#3b82f6',
  width = 80,
  height = 30,
  className,
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  // Normalize data to fit within height
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero

  const normalizedData = data.map((value) => ((value - min) / range) * height);

  // Generate SVG path
  const stepX = width / (data.length - 1 || 1);
  const points = normalizedData.map((y, i) => `${i * stepX},${height - y}`).join(' ');

  // Create smooth curve using quadratic bezier
  const pathData = normalizedData.reduce((path, y, i) => {
    const x = i * stepX;
    const yPos = height - y;
    if (i === 0) {
      return `M ${x} ${yPos}`;
    }
    const prevX = (i - 1) * stepX;
    const prevY = height - normalizedData[i - 1];
    const cpX = (prevX + x) / 2;
    return `${path} Q ${prevX} ${prevY} ${cpX} ${(prevY + yPos) / 2} T ${x} ${yPos}`;
  }, '');

  // Area fill path
  const areaPath = `${pathData} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={clsx('overflow-visible', className)}
    >
      {/* Area fill */}
      <path
        d={areaPath}
        fill={color}
        fillOpacity="0.2"
        className="transition-opacity duration-300"
      />
      {/* Line */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
      />
      {/* Points */}
      {normalizedData.map((y, i) => (
        <circle
          key={i}
          cx={i * stepX}
          cy={height - y}
          r="2"
          fill={color}
          className="transition-all duration-300"
        />
      ))}
    </svg>
  );
}


