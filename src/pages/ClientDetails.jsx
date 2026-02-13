import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  ArrowRight, Building2, User, Phone, Mail, MapPin, Edit,
  Briefcase, Calendar, Plus, MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { ClientTypeBadge, JobStatusBadge, PriorityBadge } from "@/components/ui/DynamicStatusBadge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ClientDetails() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');

  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId && user) {
      loadClientData();
    }
  }, [clientId, user]);

  const loadClientData = async () => {
    if (!user || !clientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;
      setClient(data || null);
      if (data) {
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('owner_id', user.id)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        if (jobsError) throw jobsError;
        setJobs(jobsData || []);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;
  if (!client) return <EmptyState icon={User} title="לקוח לא נמצא" description="הלקוח המבוקש לא נמצא במערכת" />;

  const displayName = client.client_type === 'company' ? client.company_name : client.contact_name;

  return (
    <div dir="rtl" className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(createPageUrl('Clients'))}
          className="rounded-full"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback className={`${client.client_type === 'company' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'} text-lg`}>
                {client.client_type === 'company' ? (
                  <Building2 className="w-6 h-6" />
                ) : (
                  displayName?.charAt(0) || '?'
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{displayName}</h1>
              {client.client_type === 'company' && client.contact_name && (
                <p className="text-slate-500">{client.contact_name}</p>
              )}
              <ClientTypeBadge type={client.client_type} />
            </div>
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={() => navigate(createPageUrl(`ClientForm?id=${client.id}`))}
        >
          <Edit className="w-4 h-4 ml-2" />
          עריכה
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          variant="outline"
          onClick={() => window.open(`tel:${client.phone}`)}
          className="h-auto py-4 flex-col gap-2"
        >
          <Phone className="w-5 h-5" />
          <span>התקשר</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const phone = (client.phone || '').replace(/\D/g, '');
            window.open(`https://wa.me/${phone}`, '_blank');
          }}
          className="h-auto py-4 flex-col gap-2 text-green-600 hover:text-green-700"
        >
          <MessageCircle className="w-5 h-5" />
          <span>WhatsApp</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`JobForm?client_id=${client.id}`))}
          className="h-auto py-4 flex-col gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>עבודה חדשה</span>
        </Button>
        {client.email && (
          <Button
            variant="outline"
            onClick={() => window.open(`mailto:${client.email}`)}
            className="h-auto py-4 flex-col gap-2"
          >
            <Mail className="w-5 h-5" />
            <span>אימייל</span>
          </Button>
        )}
      </div>

      {/* Client Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">פרטי לקוח</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">טלפון</p>
                <p className="font-medium" dir="ltr">{client.phone}</p>
              </div>
            </div>
            {client.email && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">אימייל</p>
                  <p className="font-medium" dir="ltr">{client.email}</p>
                </div>
              </div>
            )}
            {(client.address || client.fixed_address || client.city) && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">כתובת</p>
                  <p className="font-medium">
                    {[client.address || client.fixed_address, client.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">עבודות</p>
                <p className="font-medium">{jobs.length} עבודות</p>
              </div>
            </div>
          </div>
          {client.notes && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-2">הערות</p>
              <p className="text-slate-700">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            עבודות ({jobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="אין עבודות"
              description="לא נוצרו עבודות עבור לקוח זה"
              actionLabel="צור עבודה ראשונה"
              onAction={() => navigate(createPageUrl(`JobForm?client_id=${client.id}`))}
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Card 
                  key={job.id}
                  className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{job.title}</h4>
                        {(job.address || job.city) && (
                          <div className="text-slate-500 text-sm mt-1">
                            {job.address}{job.city ? `, ${job.city}` : ''}
                          </div>
                        )}
                        {job.scheduled_date && (
                          <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(job.scheduled_date), 'dd/MM/yyyy', { locale: he })}</span>
                            {job.scheduled_time && <span>• {job.scheduled_time}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <JobStatusBadge status={job.status} />
                        <PriorityBadge priority={job.priority} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
