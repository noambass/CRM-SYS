import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  Users, Briefcase, TrendingUp, Calendar,
  Clock, CheckCircle, AlertCircle, ArrowUpRight, Plus } from
'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { JobStatusBadge, PriorityBadge } from "@/components/ui/DynamicStatusBadge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import WeeklyCalendar from "@/components/dashboard/WeeklyCalendar";
import EnhancedEmptyState from "@/components/shared/EnhancedEmptyState";

import { format } from 'date-fns';


export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [stats, setStats] = useState({
     totalClients: 0,
     totalJobs: 0,
     quoteJobs: 0,
     waitingScheduleJobs: 0,
     waitingExecutionJobs: 0,
     doneJobs: 0,
     completedToday: 0
   });
   const [recentJobs, setRecentJobs] = useState([]);
    const [todayJobs, setTodayJobs] = useState([]);
    const [unscheduledJobs, setUnscheduledJobs] = useState([]);
    const [interestedClients, setInterestedClients] = useState([]);
    const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const [clientsRes, jobsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('*')
          .eq('owner_id', user.id),
        supabase
          .from('jobs')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);
      if (clientsRes.error) throw clientsRes.error;
      if (jobsRes.error) throw jobsRes.error;
      const clients = clientsRes.data || [];
      const rawJobs = jobsRes.data || [];

      const jobs = rawJobs.map((job) => {
        if (job.scheduled_at) {
          const scheduledDate = new Date(job.scheduled_at);
          return {
            ...job,
            scheduled_date: job.scheduled_date || format(scheduledDate, 'yyyy-MM-dd'),
            scheduled_time: job.scheduled_time || format(scheduledDate, 'HH:mm')
          };
        }
        return job;
      });

      const today = format(new Date(), 'yyyy-MM-dd');
      const getDateOnly = (value) => {
        if (!value) return null;
        try {
          return format(new Date(value), 'yyyy-MM-dd');
        } catch (_e) {
          return null;
        }
      };
      const todayJobsList = jobs.filter((j) => {
        const scheduledDate = j.scheduled_date || getDateOnly(j.scheduled_at);
        return scheduledDate === today;
      });
      const quoteJobs = jobs.filter((j) => j.status === 'quote');
      const waitingScheduleJobs = jobs.filter((j) => j.status === 'waiting_schedule');
      const waitingExecutionJobs = jobs.filter((j) => j.status === 'waiting_execution');
      const doneJobs = jobs.filter((j) => j.status === 'done');
      const completedToday = jobs.filter((j) => {
        const completedDate = getDateOnly(j.completed_at || j.completed_date);
        return j.status === 'done' && completedDate === today;
      });
      const unscheduledJobsList = jobs.filter((j) => {
        const scheduledDate = j.scheduled_date || getDateOnly(j.scheduled_at);
        return !scheduledDate && j.status !== 'done';
      });

      // Get interested clients (those with no jobs or no recent jobs)
      const clientsWithJobs = new Set(jobs.map(j => j.client_id));
      const interestedClientsList = clients.filter(c => !clientsWithJobs.has(c.id)).slice(0, 5);

      setStats({
        totalClients: clients.length,
        totalJobs: jobs.length,
        quoteJobs: quoteJobs.length,
        waitingScheduleJobs: waitingScheduleJobs.length,
        waitingExecutionJobs: waitingExecutionJobs.length,
        doneJobs: doneJobs.length,
        completedToday: completedToday.length
      });

      setRecentJobs(jobs.slice(0, 5));
      setTodayJobs(todayJobsList);
      setUnscheduledJobs(unscheduledJobsList);
      setInterestedClients(interestedClientsList);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) =>
  <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <div className={`absolute top-0 left-0 w-24 h-24 ${color} opacity-10 rounded-full -translate-x-8 -translate-y-8`} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
            {trend &&
          <div className="flex items-center gap-1 mt-2 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">{trend}</span>
              </div>
          }
          </div>
          <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>;


  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;

  return (
     <div className="p-3 lg:p-8 space-y-4 lg:space-y-8">
       {/* Header */}
       <div className="flex flex-col gap-4">
         <div>
           <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">שלום! 👋</h1>
           <p className="text-slate-500 mt-1">הנה סקירה של הפעילות שלך היום</p>
         </div>
         <Button
           onClick={() => navigate(createPageUrl('JobForm'))}
           style={{ backgroundColor: '#00214d' }}
           className="hover:opacity-90 shadow-lg w-full lg:w-auto"
         >
           <Plus className="w-4 h-4 ml-2" />
           עבודה חדשה
         </Button>
       </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        <StatCard
          title="הצעות מחיר"
          value={stats.quoteJobs}
          icon={Briefcase}
          color="bg-indigo-500" />

        <StatCard
          title="ממתין לתזמון"
          value={stats.waitingScheduleJobs}
          icon={Clock}
          color="bg-amber-500" />

        <StatCard
          title="ממתין לביצוע"
          value={stats.waitingExecutionJobs}
          icon={AlertCircle}
          color="bg-blue-500" />

        <StatCard
          title="בוצע"
          value={stats.doneJobs}
          icon={CheckCircle}
          color="bg-emerald-500" />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 lg:gap-4">
        <StatCard
          title="סה״כ לקוחות"
          value={stats.totalClients}
          icon={Users}
          color="bg-teal-500" />
        <StatCard
          title="סה״כ עבודות"
          value={stats.totalJobs}
          icon={Calendar}
          color="bg-purple-500" />
      </div>

          {/* Weekly Calendar */}
          <WeeklyCalendar />

      {/* Interested Clients */}
      {interestedClients.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500 bg-blue-50/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                לקוחות מתעניינים ({interestedClients.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(createPageUrl('Clients'))}
                className="text-blue-600 hover:text-blue-700">
                הצג הכל
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {interestedClients.map((client) => {
              const displayName = client.client_type === 'company' ? client.company_name : client.contact_name;
              return (
                <div
                  key={client.id}
                  onClick={() => navigate(createPageUrl(`ClientDetails?id=${client.id}`))}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white hover:bg-slate-50 cursor-pointer transition-colors border border-blue-200">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                      {displayName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{displayName}</h4>
                    <p className="text-sm text-slate-500 truncate" dir="ltr">{client.phone}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl(`JobForm?client_id=${client.id}`));
                    }}
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    עבודה
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Unscheduled Jobs */}
      {unscheduledJobs.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500 bg-orange-50/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                עבודות שטרם תוזמנו ({unscheduledJobs.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(createPageUrl('Jobs'))}
                className="text-orange-600 hover:text-orange-700">
                הצג הכל
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {unscheduledJobs.slice(0, 4).map((job) =>
            <div
              key={job.id}
              onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
              className="flex items-center gap-4 p-4 rounded-xl bg-white hover:bg-slate-50 cursor-pointer transition-colors border border-orange-200">

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{job.title}</h4>
                    <p className="text-sm text-slate-500 truncate">{job.client_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <JobStatusBadge status={job.status} />
                    <PriorityBadge priority={job.priority} />
                  </div>
                </div>
            )
            }
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-3 lg:gap-6">
         {/* Today's Jobs */}
         <Card className="border-0 shadow-sm">
           <CardHeader className="pb-4">
             <div className="flex items-center justify-between">
               <CardTitle className="text-lg font-semibold flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-emerald-500" />
                 עבודות להיום
               </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(createPageUrl('Jobs'))}
                className="text-emerald-600 hover:text-emerald-700">

                הצג הכל
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayJobs.length === 0 ?
            <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>אין עבודות מתוכננות להיום</p>
              </div> :

            todayJobs.slice(0, 4).map((job) =>
            <div
              key={job.id}
              onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{job.title}</h4>
                    <p className="text-sm text-slate-500 truncate">{job.client_name} • {job.address}{job.city ? `, ${job.city}` : ''}</p>
                    {job.scheduled_time &&
                <div className="flex items-center gap-1 mt-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{job.scheduled_time}</span>
                      </div>
                }
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <JobStatusBadge status={job.status} />
                    <PriorityBadge priority={job.priority} />
                  </div>
                </div>
            )
            }
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-500" />
                עבודות אחרונות
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(createPageUrl('Jobs'))}
                className="text-emerald-600 hover:text-emerald-700">

                הצג הכל
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentJobs.length === 0 ? (
              <EnhancedEmptyState
                icon={Briefcase}
                title="ברוכים הבאים למערכת ניהול העבודות"
                description="התחל על ידי הוספת הלקוח הראשון שלך ויצירת העבודה הראשונה"
                primaryAction={{
                  label: 'הוסף לקוח ראשון',
                  onClick: () => navigate(createPageUrl('ClientForm'))
                }}
                secondaryAction={{
                  label: 'צור עבודה',
                  onClick: () => navigate(createPageUrl('JobForm'))
                }}
              />
            ) :

            recentJobs.map((job) =>
            <div
              key={job.id}
              onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">

                  <Avatar className="h-10 w-10 bg-slate-200">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                      {job.client_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{job.title}</h4>
                    <p className="text-sm text-slate-500 truncate">{job.client_name}</p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Quick Actions */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600">
        <CardContent className="bg-[#00214d] p-6 rounded-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-white text-center sm:text-right">
              <h3 className="text-xl font-bold">פעולות מהירות</h3>
              <p className="text-emerald-100 mt-1">צור לקוח או עבודה חדשה במהירות</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate(createPageUrl('ClientForm'))}
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0">

                <Users className="w-4 h-4 ml-2" />
                לקוח חדש
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('JobForm'))}
                className="bg-white text-[#00214d] hover:bg-gray-100 shadow"
              >
                <Briefcase className="w-4 h-4 ml-2" />
                עבודה חדשה
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

}
