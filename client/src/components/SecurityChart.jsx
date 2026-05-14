// client/src/components/SecurityChart.jsx
// Wrapper Chart.js cho Bar / Doughnut / Line.
// Chart.js v4 yêu cầu đăng ký module trước khi dùng — gom 1 nơi để mọi page
// import chart đều có sẵn tất cả scale & element.

import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Đăng ký 1 lần khi module load. Re-import sau này sẽ no-op.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Option mặc định dùng chung cho mọi chart — dark theme.
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false, // cho phép cha chỉ định height (h-64...)
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 10, color: '#94a3b8', font: { size: 11 } },
    },
    tooltip: {
      intersect: false,
      mode: 'index',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
    },
  },
};

function mergeOptions(custom) {
  return {
    ...baseOptions,
    ...custom,
    plugins: { ...baseOptions.plugins, ...(custom && custom.plugins) },
  };
}

export function BarChart({ data, options }) {
  return <Bar data={data} options={mergeOptions(options)} />;
}

export function DoughnutChart({ data, options }) {
  return <Doughnut data={data} options={mergeOptions(options)} />;
}

export function LineChart({ data, options }) {
  return <Line data={data} options={mergeOptions(options)} />;
}
