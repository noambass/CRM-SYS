import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { JobStatusBadge } from "@/components/ui/DynamicStatusBadge";

export default function WeeklyCalendar() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadJobs();
  }, [weekOffset, user]);

  const loadJobs = async () => {
    if (!user) return;
    try {
      const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { locale: he });
      const weekEnd = endOfWeek(weekStart, { locale: he });

      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status, scheduled_at, address, city')
        .eq('owner_id', user.id)
        .gte('scheduled_at', weekStart.toISOString())
        .lte('scheduled_at', weekEnd.toISOString())
        .order('scheduled_at', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { locale: he });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getJobsForDay = (day) => {
    return jobs.filter(job => job.scheduled_at && isSameDay(new Date(job.scheduled_at), day));
  };

  if (isLoadingAuth || !user) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            לוח שנה
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="text-slate-600 hover:text-slate-700">
              ›
            </Button>
            <span className="text-sm text-slate-600 min-w-32 text-center">
              {format(weekDays[0], 'd/M')} - {format(weekDays[6], 'd/M')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="text-slate-600 hover:text-slate-700">
              ‹
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
              className="text-slate-600 hover:text-slate-700 text-xs">
              היום
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, idx) => {
            const dayJobs = getJobsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  isToday 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {format(day, 'EEE', { locale: he })}
                  <div className="text-xs text-slate-500 mt-0.5">
                    {format(day, 'd/M')}
                  </div>
                </div>
                <div className="space-y-1">
                   {dayJobs.slice(0, 2).map((job) => (
                     <button
                       key={job.id}
                       onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
                       className="w-full text-left text-xs p-1.5 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
                       title={`${job.description || ''}`}
                     >
                       <div className="font-medium text-slate-700 truncate">{job.title}</div>
                       {job.address && (
                         <div className="text-xs text-slate-500 truncate">{job.address}{job.city ? `, ${job.city}` : ''}</div>
                       )}
                       <div className="flex items-center gap-1 mt-0.5">
                         <JobStatusBadge status={job.status} />
                       </div>
                     </button>
                   ))}
                   {dayJobs.length > 2 && (
                     <div className="text-xs text-emerald-600 text-center py-1">
                       +{dayJobs.length - 2}
                     </div>
                   )}
                 </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
