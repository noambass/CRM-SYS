import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { uploadJobAttachment, listJobAttachments, getJobAttachmentSignedUrl } from '@/lib/storage/storageProvider';
import { 
  ArrowRight, MapPin, Calendar, User, Edit, Phone,
  Camera, FileText, CheckCircle, Loader2, Image
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

import { JobStatusBadge, PriorityBadge, InvoiceStatusBadge } from "@/components/ui/DynamicStatusBadge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

// Status actions removed - using dynamic status from AppConfig

export default function JobDetails() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  const [job, setJob] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    if (jobId && user) {
      loadJobData();
    }
  }, [jobId, user]);

  const loadAttachments = async (targetJobId) => {
    if (!user || !targetJobId) return;
    try {
      const items = await listJobAttachments({ userId: user.id, jobId: targetJobId });
      const signedItems = await Promise.all(
        items.map(async (item) => ({
          id: item.id,
          url: await getJobAttachmentSignedUrl({
            bucket: item.bucket,
            objectPath: item.object_path
          })
        }))
      );
      setAttachments(signedItems.filter(item => item.url));
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  useEffect(() => {
    if (job && isEditingSchedule) {
      if (job.scheduled_at && (!job.scheduled_date || !job.scheduled_time)) {
        const scheduledDate = new Date(job.scheduled_at);
        setScheduledDate(format(scheduledDate, 'yyyy-MM-dd'));
        setScheduledTime(format(scheduledDate, 'HH:mm'));
      } else {
        setScheduledDate(job.scheduled_date || '');
        setScheduledTime(job.scheduled_time || '');
      }
    }
  }, [isEditingSchedule, job]);

  const loadJobData = async () => {
    if (!user || !jobId) return;
    try {
      const { data: jobData, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('owner_id', user.id)
        .single();
      if (error) throw error;
      if (jobData) {
        const scheduledDate = jobData.scheduled_at
          ? new Date(jobData.scheduled_at)
          : null;
        setJob({
          ...jobData,
          scheduled_date: jobData.scheduled_date || (scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null),
          scheduled_time: jobData.scheduled_time || (scheduledDate ? format(scheduledDate, 'HH:mm') : null),
          created_date: jobData.created_date || jobData.created_at
        });
        await loadAttachments(jobData.id);
        if (jobData.client_id) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', jobData.client_id)
            .eq('owner_id', user.id)
            .single();
          if (clientError) throw clientError;
          setClient(clientData || null);
        }
      }
    } catch (error) {
      console.error('Error loading job:', error);
      toast.error('שגיאה בטעינת עבודה', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (newStatus) => {
    if (!user) return;
    setUpdating(true);
    try {
      const updateData = {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      };
      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .eq('owner_id', user.id);
      if (error) throw error;
      setJob(prev => ({ ...prev, ...updateData }));
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('שגיאה בעדכון סטטוס', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleScheduleJob = async () => {
    if (!scheduledDate || !scheduledTime) return;
    if (!user) return;
    setUpdating(true);
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      const nextStatus = job?.status === 'waiting_schedule' ? 'waiting_execution' : job?.status;
      const finalStatus = job?.status === 'done' ? 'done' : nextStatus;
      const { error } = await supabase
        .from('jobs')
        .update({
          scheduled_at: scheduledAt,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          status: finalStatus,
          completed_at: finalStatus === 'done' ? (job?.completed_at || new Date().toISOString()) : null
        })
        .eq('id', jobId)
        .eq('owner_id', user.id);
      if (error) throw error;
      setJob(prev => ({
        ...prev,
        scheduled_at: scheduledAt,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: finalStatus,
        completed_at: finalStatus === 'done' ? (prev?.completed_at || new Date().toISOString()) : null
      }));
      setIsEditingSchedule(false);
      // Navigate to Calendar after scheduling
      setTimeout(() => navigate(createPageUrl('Calendar')), 500);
    } catch (error) {
      console.error('Error scheduling job:', error);
      toast.error('שגיאה בתזמון עבודה', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!user) return;

    setUploadingPhoto(true);
    try {
      const attachment = await uploadJobAttachment({ userId: user.id, jobId, file });
      const url = await getJobAttachmentSignedUrl({
        bucket: attachment.bucket,
        objectPath: attachment.object_path
      });
      if (url) {
        setAttachments(prev => [{ id: attachment.id, url }, ...prev]);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('שגיאה בהעלאת תמונה', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    if (!user) return;
    try {
      const notes = job.notes ? `${job.notes}\n\n[${format(new Date(), 'dd/MM/yyyy HH:mm')}]\n${newNote}` : `[${format(new Date(), 'dd/MM/yyyy HH:mm')}]\n${newNote}`;
      const { error } = await supabase
        .from('jobs')
        .update({ notes })
        .eq('id', jobId)
        .eq('owner_id', user.id);
      if (error) throw error;
      setJob(prev => ({ ...prev, notes }));
      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('שגיאה בהוספת הערה', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    }
  };



  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;
  if (!job) return <EmptyState icon={FileText} title="עבודה לא נמצאה" description="העבודה המבוקשת לא נמצאה במערכת" />;

  return (
    <div dir="rtl" className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Created Date */}
        <div className="text-sm text-slate-500">
          נוצרה: {format(new Date(job.created_date), 'dd/MM/yyyy', { locale: he })}
        </div>

        {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(createPageUrl('Jobs'))}
          className="rounded-full"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{job.title}</h1>
          <p className="text-slate-500 mt-1">{job.client_name}</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => navigate(createPageUrl(`JobForm?id=${job.id}`))}
        >
          <Edit className="w-4 h-4 ml-2" />
          עריכה
        </Button>
      </div>

      {/* Status & Priority */}
       <div className="flex flex-wrap gap-3">
         <JobStatusBadge status={job.status} />
         <PriorityBadge priority={job.priority} />
         {job.invoice_status && job.invoice_status !== 'not_created' && (
           <InvoiceStatusBadge status={job.invoice_status} />
         )}
       </div>

      {/* Complete Job Action */}
      {job.status !== 'done' && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <Button
              onClick={() => updateJobStatus('done')}
              disabled={updating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updating ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 ml-2" />
              )}
              סמן את העבודה כהושלמה
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Client Info */}
      {client && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">פרטי לקוח ואיש קשר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div 
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => navigate(createPageUrl(`ClientDetails?id=${client.id}`))}
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                  {job.client_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">{job.client_name}</h4>
                <p className="text-sm text-slate-500" dir="ltr">{job.client_phone || client.phone}</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`tel:${job.client_phone || client.phone}`);
                }}
              >
                <Phone className="w-4 h-4" />
              </Button>
            </div>

            {job.contact_name && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {job.contact_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-medium mb-1">איש קשר בעבודה</p>
                  <h4 className="font-semibold text-slate-800">{job.contact_name}</h4>
                  {job.contact_phone && (
                    <p className="text-sm text-slate-500" dir="ltr">{job.contact_phone}</p>
                  )}
                </div>
                {job.contact_phone && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => window.open(`tel:${job.contact_phone}`)}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">פרטי העבודה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.description && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-2 font-medium">תיאור העבודה</p>
              <p className="text-slate-700 leading-relaxed">{job.description}</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">כתובת</p>
                <p className="font-medium text-slate-800">{job.address}{job.city ? `, ${job.city}` : ''}</p>
              </div>
            </div>

            {!isEditingSchedule ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">תאריך מתוכנן</p>
                  <p className="font-medium text-slate-800">
                    {job.scheduled_date ? (
                      <>
                          {format(new Date(job.scheduled_date), 'dd/MM/yyyy')}
                          {job.scheduled_time && ` • ${job.scheduled_time}`}
                        </>
                      ) : (
                        'לא תוזמן עדיין'
                      )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingSchedule(true)}
                >
                  {job.scheduled_date ? 'ערוך' : 'תזמן'}
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <p className="text-sm font-medium text-slate-700">תזמון העבודה</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">תאריך</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">שעה</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleScheduleJob}
                    disabled={!scheduledDate || !scheduledTime || updating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {updating ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null}
                    שמור תזמון
                  </Button>
                  <Button
                    onClick={() => setIsEditingSchedule(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={updating}
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            )}

            {job.assigned_to_name && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">מוקצה ל</p>
                  <p className="font-medium text-slate-800">{job.assigned_to_name}</p>
                </div>
              </div>
            )}

            {/* DB impact: none (display formatting only; uses existing line_items/total_price fields). */}
            {job.line_items && job.line_items.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm text-emerald-700 font-medium mb-3">פרטי עבודה ומחיר</p>
                <div className="space-y-2">
                  {job.line_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{item.description}</p>
                        <p className="text-xs text-slate-500">כמות: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-800">₪{((Number(item.quantity) || 0) * (Number(item.price) || 0)).toFixed(2)}</p>
                        <p className="text-xs text-slate-500">₪{(Number(item.price) || 0).toFixed(2)} ליח'</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-300 flex justify-between">
                  <span className="text-sm text-slate-600">לפני מע"מ</span>
                  <span className="font-semibold text-slate-800">₪{(Number(job.total_price) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-emerald-700">סה״כ כולל מע"מ 18%</span>
                  <span className="font-bold text-lg text-emerald-600">₪{((Number(job.total_price) || 0) * 1.18).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5" />
            תמונות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {(attachments.length ? attachments.map(a => a.url) : (job.photos || [])).map((photo, idx) => (
              <a 
                key={idx} 
                href={photo} 
                target="_blank" 
                rel="noopener noreferrer"
                className="aspect-square rounded-xl overflow-hidden bg-slate-100"
              >
                <img 
                  src={photo} 
                  alt={`תמונה ${idx + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </a>
            ))}
          </div>
          
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
            {uploadingPhoto ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            ) : (
              <Image className="w-5 h-5 text-slate-400" />
            )}
            <span className="text-slate-500">
              {uploadingPhoto ? 'מעלה...' : 'הוסף תמונה'}
            </span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
          </label>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">הערות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.notes && (
            <div className="p-4 bg-slate-50 rounded-xl whitespace-pre-wrap text-slate-700">
              {job.notes}
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="הוסף הערה חדשה..."
              rows={2}
              className="flex-1"
            />
            <Button 
              onClick={addNote}
              disabled={!newNote.trim()}
              style={{ backgroundColor: '#00214d' }}
              className="hover:opacity-90"
            >
              הוסף
            </Button>
          </div>

          {job.internal_notes && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-medium text-amber-700 mb-2">הערות פנימיות</p>
              <p className="text-slate-700 whitespace-pre-wrap">{job.internal_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
