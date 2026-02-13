import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, Edit, FileText, Loader2, Briefcase, ExternalLink, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const QUOTE_STATUSES = [
  { value: 'draft', label: 'טיוטה', color: '#64748b' },
  { value: 'sent', label: 'נשלחה', color: '#8b5cf6' },
  { value: 'approved', label: 'אושרה', color: '#10b981' },
  { value: 'rejected', label: 'נדחתה', color: '#ef4444' },
];

// Allowed transitions: draft -> sent -> approved/rejected
const QUOTE_ALLOWED_TRANSITIONS = {
  draft: ['sent'],
  sent: ['approved', 'rejected'],
  approved: [],
  rejected: ['draft'],
};

export default function QuoteDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoadingAuth } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const quoteId = urlParams.get('id');

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (quoteId && user) {
      loadQuote();
    }
  }, [quoteId, user]);

  const loadQuote = async () => {
    if (!user || !quoteId) return;
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('owner_id', user.id)
        .single();
      if (error) throw error;
      setQuote(data);
    } catch (error) {
      console.error('Error loading quote:', error);
      toast.error('שגיאה בטעינת הצעת מחיר');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    if (!user || !quoteId) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quoteId)
        .eq('owner_id', user.id);
      if (error) throw error;
      setQuote(prev => ({ ...prev, status: newStatus }));
      toast.success('נשמר בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('שגיאה בעדכון סטטוס');
    } finally {
      setUpdating(false);
    }
  };

  const convertToJob = async () => {
    if (!user || !quote) return;

    if (quote.status !== 'approved') {
      toast.error('ניתן להמיר לעבודה רק הצעה שאושרה');
      return;
    }
    if (quote.converted_job_id) {
      toast.error('הצעה זו כבר הומרה לעבודה');
      return;
    }

    setConverting(true);
    try {
      // Atomic: create job + update quote in sequence
      const jobData = {
        owner_id: user.id,
        client_id: quote.client_id,
        client_name: quote.client_name,
        client_phone: quote.client_phone,
        title: 'ציפוי אמבטיה',
        description: quote.notes || '',
        status: 'waiting_schedule',
        priority: 'normal',
        warranty: true,
        warranty_note: '',
        quote_id: quote.id,
        agreed_amount: Number(quote.total) || 0,
      };

      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select('id')
        .single();
      if (jobError) throw jobError;

      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ converted_job_id: newJob.id })
        .eq('id', quoteId)
        .eq('owner_id', user.id);
      if (quoteError) throw quoteError;

      setQuote(prev => ({ ...prev, converted_job_id: newJob.id }));
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      toast.success('ההצעה הומרה לעבודה בהצלחה');
      navigate(createPageUrl(`JobDetails?id=${newJob.id}`));
    } catch (error) {
      console.error('Error converting to job:', error);
      toast.error('שגיאה בהמרה לעבודה', {
        description: 'נסה שוב בעוד רגע',
      });
    } finally {
      setConverting(false);
    }
  };

  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;
  if (!quote) return <EmptyState icon={FileText} title="הצעה לא נמצאה" description="הצעת המחיר המבוקשת לא נמצאה במערכת" />;

  const statusCfg = QUOTE_STATUSES.find(s => s.value === quote.status) || { label: quote.status, color: '#64748b' };
  const canEdit = quote.status === 'draft' && !quote.converted_job_id;
  const canConvert = quote.status === 'approved' && !quote.converted_job_id;
  const lineItems = Array.isArray(quote.line_items) ? quote.line_items : [];
  const allowedNextStatuses = QUOTE_ALLOWED_TRANSITIONS[quote.status] || [];

  return (
    <div dir="rtl" className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Created Date */}
      <div className="text-sm text-slate-500">
        נוצרה: {format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: he })}
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('Quotes'))}
          className="rounded-full"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">הצעת מחיר</h1>
          <p
            className="text-blue-600 mt-1 cursor-pointer hover:underline"
            onClick={() => quote.client_id && navigate(createPageUrl(`ClientDetails?id=${quote.client_id}`))}
          >
            <User className="w-4 h-4 inline ml-1" />
            {quote.client_name}
          </p>
        </div>
        <div className="text-2xl font-bold text-slate-800" dir="ltr">
          {Number(quote.total).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &#8362;
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">סטטוס:</span>
        <Badge
          variant="outline"
          style={{
            backgroundColor: `${statusCfg.color}20`,
            color: statusCfg.color,
            borderColor: statusCfg.color
          }}
          className="font-medium text-base px-3 py-1"
        >
          {statusCfg.label}
        </Badge>
      </div>

      {/* Status Chips */}
      {allowedNextStatuses.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-3">קדם סטטוס:</p>
            <div className="flex flex-wrap gap-2">
              {allowedNextStatuses.map((nextValue) => {
                const s = QUOTE_STATUSES.find(st => st.value === nextValue);
                if (!s) return null;
                return (
                  <Button
                    key={s.value}
                    size="sm"
                    disabled={updating}
                    onClick={() => updateStatus(s.value)}
                    style={{ backgroundColor: s.color }}
                    className="text-white hover:opacity-90"
                  >
                    {s.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl(`QuoteForm?id=${quote.id}`))}
          >
            <Edit className="w-4 h-4 ml-2" />
            ערוך טיוטה
          </Button>
        )}

        {canConvert && (
          <Button
            onClick={convertToJob}
            disabled={converting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {converting ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Briefcase className="w-4 h-4 ml-2" />
            )}
            המר לעבודה
          </Button>
        )}

        {quote.converted_job_id && (
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl(`JobDetails?id=${quote.converted_job_id}`))}
            className="text-blue-600 border-blue-300"
          >
            <ExternalLink className="w-4 h-4 ml-2" />
            פתח עבודה
          </Button>
        )}
      </div>

      {/* Line Items */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">שורות שירות</CardTitle>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <p className="text-slate-500 text-center py-4">אין שורות בהצעה זו</p>
          ) : (
            <div className="space-y-3">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-slate-500 px-3 pb-2 border-b">
                <div className="col-span-5">תיאור</div>
                <div className="col-span-2 text-center">כמות</div>
                <div className="col-span-2 text-center">מחיר יחידה</div>
                <div className="col-span-3 text-left">סה״כ</div>
              </div>

              {lineItems.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                return (
                  <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-5 font-medium text-slate-800">{item.description}</div>
                    <div className="col-span-2 text-center text-slate-600">{item.quantity}</div>
                    <div className="col-span-2 text-center text-slate-600" dir="ltr">
                      {Number(item.unit_price).toLocaleString('he-IL', { minimumFractionDigits: 2 })} &#8362;
                    </div>
                    <div className="col-span-3 text-left font-semibold text-slate-800" dir="ltr">
                      {lineTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })} &#8362;
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-slate-800 text-white rounded-xl mt-4">
                <span className="text-lg font-bold">סה״כ הצעה:</span>
                <span className="text-2xl font-bold" dir="ltr">
                  {Number(quote.total).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &#8362;
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">הערות</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
