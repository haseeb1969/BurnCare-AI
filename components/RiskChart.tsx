import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface RiskChartProps {
  percent: number;
}

export const RiskChart: React.FC<RiskChartProps> = ({ percent }) => {
  const data = [
    { name: 'Risk', value: percent },
    { name: 'Survival', value: 100 - percent },
  ];

  let color = '#22c55e'; // Green
  if (percent > 30) color = '#eab308'; // Yellow
  if (percent > 60) color = '#f97316'; // Orange
  if (percent > 80) color = '#ef4444'; // Red

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={180}
            endAngle={0}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell key="risk" fill={color} />
            <Cell key="survival" fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-8">
        <span className="text-4xl font-bold" style={{ color }}>
          {percent.toFixed(1)}%
        </span>
        <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Mortality Risk</span>
      </div>
    </div>
  );
};
