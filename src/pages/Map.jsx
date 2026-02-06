import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { JOB_STATUS_COLORS, JOB_STATUS_OPTIONS } from '@/config/legacyUiConfig';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Briefcase, MessageCircle, Calendar,
  Filter, Search, Clock
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobStatusBadge, PriorityBadge } from "@/components/ui/DynamicStatusBadge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker colors
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
      <div style="transform: rotate(45deg); margin-top: 3px; margin-right: 6px;">📍</div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

export default function Map() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [expandStatusFilter, setExpandStatusFilter] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [mapCenter, setMapCenter] = useState([32.0853, 34.7818]); // Tel Aviv default
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' });
  const [statusColors, setStatusColors] = useState(JOB_STATUS_COLORS);
  const [statusOptions, setStatusOptions] = useState(JOB_STATUS_OPTIONS);

  useEffect(() => {
    if (!user) return;
    loadJobs();
    loadStatusConfig();
  }, [user]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, statusFilter]);

  const geocodeAddress = async (address, city) => {
    try {
      const fullAddress = `${address}, ${city || ''}, Israel`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const loadJobs = async () => {
    if (!user) return;
    try {
      const jobsRes = await supabase
        .from('jobs')
        .select('id, client_id, client_name, title, description, status, priority, scheduled_at, scheduled_date, scheduled_time, address, city, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (jobsRes.error) throw jobsRes.error;
      const jobsData = (jobsRes.data || []).map((job) => {
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
      
      // Geocode all addresses
      const jobsWithCoords = await Promise.all(
        jobsData.map(async (job) => {
          const coords = await geocodeAddress(job.address, job.city);
          return {
            ...job,
            lat: coords?.lat || 32.0853,
            lng: coords?.lng || 34.7818
          };
        })
      );
      
      setJobs(jobsWithCoords);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatusConfig = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('app_configs')
        .select('config_data')
        .eq('owner_id', user.id)
        .eq('config_type', 'job_statuses')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data?.config_data?.statuses) {
        const options = [
          { value: 'all', label: 'כל הסטטוסים' },
          ...data.config_data.statuses.map((s) => ({ value: s.value, label: s.label }))
        ];
        const colors = { ...JOB_STATUS_COLORS };
        data.config_data.statuses.forEach((s) => {
          colors[s.value] = s.color;
        });
        setStatusOptions(options);
        setStatusColors(colors);
      } else {
        setStatusOptions(JOB_STATUS_OPTIONS);
        setStatusColors(JOB_STATUS_COLORS);
      }
    } catch (error) {
      console.error('Error loading status configs:', error);
      setStatusOptions(JOB_STATUS_OPTIONS);
      setStatusColors(JOB_STATUS_COLORS);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(j => 
        j.title?.toLowerCase().includes(query) ||
        j.client_name?.toLowerCase().includes(query) ||
        j.address?.toLowerCase().includes(query)
      );
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(j => selectedStatuses.includes(j.status));
    }

    setFilteredJobs(filtered);
  };

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, selectedStatuses]);

  const openWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleScheduleJob = async () => {
    if (!selectedJob || !scheduleData.date || !scheduleData.time) return;
    if (!user) return;
    
    try {
      const scheduledAt = new Date(`${scheduleData.date}T${scheduleData.time}`).toISOString();
      const nextStatus = selectedJob.status === 'waiting_schedule'
        ? 'waiting_execution'
        : selectedJob.status;
      const updateData = {
        scheduled_at: scheduledAt,
        scheduled_date: scheduleData.date,
        scheduled_time: scheduleData.time,
        status: selectedJob.status === 'done' ? selectedJob.status : nextStatus
      };

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', selectedJob.id)
        .eq('owner_id', user.id);
      if (error) throw error;
      
      // Update local state
      setJobs(jobs.map(j => j.id === selectedJob.id ? {
        ...j,
        ...updateData
      } : j));
      
      setScheduleDialogOpen(false);
      setScheduleData({ date: '', time: '' });
    } catch (error) {
      console.error('Error scheduling job:', error);
    }
  };

  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;

  return (
    <div dir="rtl" className="h-[calc(100vh-64px)] lg:h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="lg:w-96 bg-white border-l border-slate-200 flex flex-col order-2 lg:order-1 h-1/3 lg:h-full">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
            <MapPin className="w-6 h-6 text-emerald-500" />
            מפת עבודות
          </h1>
          
          <div className="space-y-3 relative">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-slate-50 border-0"
              />
            </div>

            <button
              onClick={() => setExpandStatusFilter(!expandStatusFilter)}
              className="w-full px-3 py-2 rounded-md bg-slate-50 border-0 text-right flex items-center justify-between hover:bg-slate-100 transition-colors text-sm"
            >
              <span className="text-slate-600">
                {selectedStatuses.length === 0 ? 'כל הסטטוסים' : `${selectedStatuses.length} סטטוסים`}
              </span>
              <Filter className="w-4 h-4 ml-2" />
            </button>

            {expandStatusFilter && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 space-y-2">
                {statusOptions.filter(opt => opt.value !== 'all').map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(opt.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStatuses([...selectedStatuses, opt.value]);
                        } else {
                          setSelectedStatuses(selectedStatuses.filter(s => s !== opt.value));
                        }
                      }}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredJobs.map((job) => (
            <Card 
              key={job.id}
              className={`border-0 shadow-sm cursor-pointer transition-all ${
                selectedJob?.id === job.id ? 'ring-2 ring-emerald-500' : 'hover:shadow-md'
              }`}
              onClick={() => {
                setSelectedJob(job);
                setMapCenter([job.lat, job.lng]);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-3 h-3 rounded-full mt-1.5" 
                    style={{ backgroundColor: statusColors[job.status] }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{job.title}</h4>
                    <p className="text-sm text-slate-600 truncate">{job.client_name}</p>
                    {job.description && (
                      <p className="text-xs text-slate-500 mt-1 truncate">{job.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{job.address}{job.city ? `, ${job.city}` : ''}</span>
                    </div>
                    {job.scheduled_date && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(job.scheduled_date), 'dd/MM')}</span>
                        {job.scheduled_time && <span>{job.scheduled_time}</span>}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <JobStatusBadge status={job.status} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 order-1 lg:order-2 h-2/3 lg:h-full relative z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
          key={`${mapCenter[0]}-${mapCenter[1]}`}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {filteredJobs.map((job) => (
            <Marker 
              key={job.id}
              position={[job.lat, job.lng]}
              icon={createCustomIcon(statusColors[job.status])}
              eventHandlers={{
                click: () => setSelectedJob(job)
              }}
            >
              <Popup maxWidth={300}>
                <div dir="rtl" className="p-2 w-full">
                  <h3 className="font-bold text-slate-800 mb-2">{job.title}</h3>
                  <p className="text-sm text-slate-600 mb-1">{job.client_name}</p>
                  {job.description && (
                    <p className="text-xs text-slate-500 mb-2">{job.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                    <MapPin className="w-3 h-3" />
                    <span>{job.address}{job.city ? `, ${job.city}` : ''}</span>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <JobStatusBadge status={job.status} />
                    <PriorityBadge priority={job.priority} />
                  </div>

                  {job.scheduled_date && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(job.scheduled_date), 'dd/MM/yyyy')}</span>
                      {job.scheduled_time && <span>• {job.scheduled_time}</span>}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(createPageUrl(`JobDetails?id=${job.id}`));
                      }}
                      className="flex-1"
                    >
                      <Briefcase className="w-3 h-3 ml-1" />
                      פרטים
                    </Button>
                    {job.client_phone && (
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWhatsApp(job.client_phone);
                        }}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    )}
                    {!job.scheduled_date && (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScheduleDialogOpen(true);
                        }}
                      >
                        <Clock className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        </div>

        {/* Schedule Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>תזמון עבודה: {selectedJob?.title}</DialogTitle>
           </DialogHeader>

           <div className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="schedule-date">תאריך</Label>
               <Input
                 id="schedule-date"
                 type="date"
                 value={scheduleData.date}
                 onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
               />
             </div>

             <div className="space-y-2">
               <Label htmlFor="schedule-time">שעה</Label>
               <select
                 id="schedule-time"
                 value={scheduleData.time}
                 onChange={(e) => setScheduleData(prev => ({ ...prev, time: e.target.value }))}
                 className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
               >
                 <option value="">בחר שעה...</option>
                 {(() => {
                   const times = [];
                   for (let h = 0; h < 24; h++) {
                     for (let m = 0; m < 60; m += 30) {
                       const hour = String(h).padStart(2, '0');
                       const minute = String(m).padStart(2, '0');
                       times.push(`${hour}:${minute}`);
                     }
                   }
                   return times.map(time => (
                     <option key={time} value={time}>{time}</option>
                   ));
                 })()}
               </select>
             </div>
           </div>

           <DialogFooter className="flex-row-reverse gap-2">
             <Button
               onClick={handleScheduleJob}
               disabled={!scheduleData.date || !scheduleData.time}
               style={{ backgroundColor: '#00214d' }}
               className="hover:opacity-90"
             >
               תזמן
             </Button>
             <Button
               type="button"
               variant="outline"
               onClick={() => {
                 setScheduleDialogOpen(false);
                 setScheduleData({ date: '', time: '' });
               }}
             >
               ביטול
             </Button>
           </DialogFooter>
         </DialogContent>
        </Dialog>
        </div>
        );
        }
