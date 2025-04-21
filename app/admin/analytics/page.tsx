'use client';

import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  TimeScale,
  ChartOptions
} from 'chart.js';
import { Card } from '@/components/ui/card';
import 'chartjs-adapter-date-fns';
import { fetchUserDocumentStats, fetchTimelineStats } from './fetch';
import type { DocumentStats, TimelineStats } from './fetch';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  TimeScale
);

// Sophisticated color palette
const COLORS = {
  primary: {
    main: '#4F46E5', // Indigo
    light: 'rgba(79, 70, 229, 0.5)',
  },
  secondary: {
    main: '#10B981', // Emerald
    light: 'rgba(16, 185, 129, 0.5)',
  },
  accent: {
    main: '#F59E0B', // Amber
    light: 'rgba(245, 158, 11, 0.5)',
  },
  neutral: {
    main: '#6B7280', // Gray
    light: 'rgba(107, 114, 128, 0.5)',
  },
  error: {
    main: '#EF4444', // Red
    light: 'rgba(239, 68, 68, 0.5)',
  },
};

export default function AnalyticsPage() {
  const [userStats, setUserStats] = useState<DocumentStats[]>([]);
  const [timelineStats, setTimelineStats] = useState<TimelineStats[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [docStats, timeline] = await Promise.all([
          fetchUserDocumentStats(),
          fetchTimelineStats()
        ]);
        setUserStats(docStats);
        setTimelineStats(timeline);
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    };
    loadStats();
  }, []);

  const userChartData = {
    labels: userStats.map(stat => stat.user_full_name),
    datasets: [{
      label: 'Total Pages',
      data: userStats.map(stat => stat.total_pages),
      backgroundColor: COLORS.primary.light,
      borderColor: COLORS.primary.main,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const timelineChartData = {
    labels: timelineStats.map(stat => stat.date),
    datasets: [
      {
        label: 'Admin Uploads',
        data: timelineStats.map(stat => stat.admin_uploads),
        borderColor: COLORS.secondary.main,
        backgroundColor: COLORS.secondary.light,
        borderWidth: 2,
        tension: 0.1,
        fill: true,
      },
      {
        label: 'User Uploads',
        data: timelineStats.map(stat => stat.user_uploads),
        borderColor: COLORS.accent.main,
        backgroundColor: COLORS.accent.light,
        borderWidth: 2,
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false,
          display: true, // Add this to satisfy types
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    },
  };

  const timelineOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d'
          }
        },
        grid: {
          display: false,
        },
        ticks: {
          source: 'labels'
        }
      },
      y: {
        ...chartOptions.scales?.y,
      }
    } as const,
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">User/Document Analytics</h1>
      
      <Card className="p-4 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">User Document Pages</h2>
        <div className="h-[400px]">
          <Bar
            data={userChartData}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  display: true,
                  text: 'Total Pages by User',
                  color: COLORS.neutral.main,
                },
              }
            }}
          />
        </div>
      </Card>

      <Card className="p-4 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Upload Timeline</h2>
        <div className="h-[400px]">
          <Line
            data={timelineChartData}
            options={{
              ...timelineOptions,
              plugins: {
                ...timelineOptions.plugins,
                title: {
                  display: true,
                  text: 'Document Uploads Over Time',
                  color: COLORS.neutral.main,
                },
              }
            }}
          />
        </div>
      </Card>
    </div>
  );
}