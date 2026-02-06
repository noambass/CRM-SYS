import React from 'react';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobStatusBadge, PriorityBadge } from "@/components/ui/DynamicStatusBadge";
import { format } from 'date-fns';
import { MapPin, Calendar } from 'lucide-react';
import EmptyState from "@/components/shared/EmptyState";
import { Briefcase } from 'lucide-react';

export function JobsListView({ jobs, navigate }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="אין עבודות"
        description="לא נמצאו עבודות התואמות לחיפוש"
      />
    );
  }

  return (
     <div className="space-y-2">
       {jobs.map((job) => (
         <Card 
           key={job.id}
           className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
           onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
         >
           <CardContent className="p-3">
             <div className="flex items-start justify-between gap-3">
               <div className="flex-1 min-w-0">
                 <h3 className="font-semibold text-slate-800 text-sm mb-1">{job.title}</h3>
                 <p className="text-xs text-slate-600 mb-1">{job.client_name}</p>
                 {job.description && (
                   <p className="text-xs text-slate-500 line-clamp-1 mb-1">{job.description}</p>
                 )}
                 {(job.address || job.city) && (
                   <div className="flex items-center gap-1 text-xs text-slate-500">
                     <MapPin className="w-3 h-3" />
                     <span>{job.address}{job.city ? `, ${job.city}` : ''}</span>
                   </div>
                 )}
               </div>
               <div className="flex flex-col items-end gap-1 flex-shrink-0">
                 <JobStatusBadge status={job.status} />
                 <PriorityBadge priority={job.priority} />
               </div>
             </div>
           </CardContent>
         </Card>
       ))}
     </div>
    );
}

export function JobsByStatusView({ jobs, navigate }) {
   const statusOrder = ['new', 'scheduled', 'in_progress', 'on_the_way', 'completed', 'pending_payment', 'cancelled'];
   const grouped = {};

   statusOrder.forEach(status => {
     grouped[status] = jobs.filter(j => j.status === status);
   });

   return (
     <div className="space-y-4">
       {Object.entries(grouped).map(([status, statusJobs]) => {
         if (statusJobs.length === 0) return null;

         const statusLabels = {
           new: 'חדש',
           scheduled: 'מתוזמן',
           in_progress: 'בביצוע',
           on_the_way: 'בדרך',
           completed: 'הושלם',
           pending_payment: 'ממתין לתשלום',
           cancelled: 'בוטל'
         };

         return (
           <div key={status}>
             <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
               {statusLabels[status]}
               <Badge variant="outline">{statusJobs.length}</Badge>
             </h3>
             <div className="space-y-2">
              {statusJobs.map((job) => (
                <Card 
                  key={job.id}
                  className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 text-sm mb-1">{job.title}</h4>
                        <p className="text-xs text-slate-600 mb-1">{job.client_name}</p>
                        {job.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mb-1">{job.description}</p>
                        )}
                        {(job.address || job.city) && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            <span>{job.address}{job.city ? `, ${job.city}` : ''}</span>
                          </div>
                        )}
                      </div>
                      <PriorityBadge priority={job.priority} />
                    </div>
                  </CardContent>
                </Card>
              ))}
             </div>
           </div>
         );
       })}
     </div>
   );
 }

export function JobsByClientsView({ jobs, navigate }) {
   const grouped = {};

   jobs.forEach(job => {
     if (!grouped[job.client_name]) {
       grouped[job.client_name] = [];
     }
     grouped[job.client_name].push(job);
   });

   const sortedClients = Object.keys(grouped).sort();

   return (
     <div className="space-y-4">
       {sortedClients.map((clientName) => (
         <div key={clientName}>
           <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
             {clientName}
             <Badge variant="outline">{grouped[clientName].length}</Badge>
           </h3>
           <div className="space-y-2">
            {grouped[clientName].map((job) => (
              <Card 
                key={job.id}
                className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 text-sm mb-1">{job.title}</h4>
                      {job.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mb-1">{job.description}</p>
                      )}
                      {(job.address || job.city) && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />
                          <span>{job.address}{job.city ? `, ${job.city}` : ''}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <JobStatusBadge status={job.status} />
                      <PriorityBadge priority={job.priority} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
           </div>
         </div>
       ))}
     </div>
   );
 }

export function JobsByDateView({ jobs, navigate }) {
   const grouped = {};

   jobs.forEach(job => {
     if (job.scheduled_date) {
       if (!grouped[job.scheduled_date]) {
         grouped[job.scheduled_date] = [];
       }
       grouped[job.scheduled_date].push(job);
     }
   });

   const sortedDates = Object.keys(grouped).sort().reverse();

   return (
     <div className="space-y-4">
       {sortedDates.map((date) => (
         <div key={date}>
           <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
             {format(new Date(date), 'EEEE, dd/MM/yyyy')}
             <Badge variant="outline">{grouped[date].length}</Badge>
           </h3>
           <div className="space-y-2">
            {grouped[date]
              .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))
              .map((job) => (
              <Card 
                key={job.id}
                className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 text-sm mb-1">{job.title}</h4>
                      <p className="text-xs text-slate-600 mb-1">{job.client_name}</p>
                      {job.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mb-1">{job.description}</p>
                      )}
                      {(job.address || job.city) && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />
                          <span>{job.address}{job.city ? `, ${job.city}` : ''}</span>
                        </div>
                      )}
                      {job.scheduled_time && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>{job.scheduled_time}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <JobStatusBadge status={job.status} />
                      <PriorityBadge priority={job.priority} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
           </div>
         </div>
       ))}
     </div>
   );
 }
