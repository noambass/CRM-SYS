import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import {
  FileText, Search, Plus, Filter
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EnhancedEmptyState from "@/components/shared/EnhancedEmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const QUOTE_STATUS_OPTIONS = [
  { value: 'all', label: 'כל הסטטוסים' },
  { value: 'draft', label: 'טיוטה' },
  { value: 'sent', label: 'נשלחה' },
  { value: 'approved', label: 'אושרה' },
  { value: 'rejected', label: 'נדחתה' },
];

const QUOTE_STATUS_CONFIG = {
  draft: { label: 'טיוטה', color: '#64748b' },
  sent: { label: 'נשלחה', color: '#8b5cf6' },
  approved: { label: 'אושרה', color: '#10b981' },
  rejected: { label: 'נדחתה', color: '#ef4444' },
};

export default function Quotes() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    loadQuotes();
  }, [user]);

  useEffect(() => {
    filterQuotes();
  }, [quotes, searchQuery, statusFilter]);

  const loadQuotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast.error('שגיאה בטעינת הצעות מחיר', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = () => {
    let filtered = [...quotes];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.client_name?.toLowerCase().includes(query) ||
        q.notes?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    setFilteredQuotes(filtered);
  };

  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;

  return (
    <div dir="rtl" className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">הצעות מחיר</h1>
          <p className="text-slate-500 mt-1">{quotes.length} הצעות במערכת</p>
        </div>
        <Button
          onClick={() => navigate(createPageUrl('QuoteForm'))}
          style={{ backgroundColor: '#00214d' }}
          className="hover:opacity-90 shadow-lg"
        >
          <Plus className="w-4 h-4 ml-2" />
          הצעה חדשה
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם לקוח..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 border-slate-200"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        searchQuery || statusFilter !== 'all' ? (
          <EnhancedEmptyState
            icon={FileText}
            title="לא נמצאו תוצאות התואמות לסינון"
            description="נסה לשנות את הסינון או החיפוש כדי לראות יותר הצעות"
            variant="filtered"
            primaryAction={{
              label: 'נקה סינון',
              onClick: () => {
                setSearchQuery('');
                setStatusFilter('all');
              }
            }}
          />
        ) : (
          <EnhancedEmptyState
            icon={FileText}
            title="אין הצעות מחיר עדיין"
            description="כל ההצעות שתוסיף יופיעו כאן. התחל על ידי יצירת ההצעה הראשונה"
            primaryAction={{
              label: 'צור הצעה ראשונה',
              onClick: () => navigate(createPageUrl('QuoteForm'))
            }}
          />
        )
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => {
            const statusCfg = QUOTE_STATUS_CONFIG[quote.status] || { label: quote.status, color: '#64748b' };
            const isReadyToConvert = quote.status === 'approved' && !quote.converted_job_id;
            return (
              <Card
                key={quote.id}
                className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(createPageUrl(`QuoteDetails?id=${quote.id}`))}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800">{quote.client_name || 'ללא שם'}</h4>
                      {quote.notes && (
                        <p className="text-sm text-slate-500 mt-1 truncate">{quote.notes}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                        <span>{format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: he })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 mr-4">
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${statusCfg.color}20`,
                          color: statusCfg.color,
                          borderColor: statusCfg.color
                        }}
                        className="font-medium"
                      >
                        {statusCfg.label}
                      </Badge>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-slate-500">כולל מע״מ</span>
                        <span className="text-lg font-bold text-slate-800" dir="ltr">
                          {(Number(quote.total) * 1.18).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &#8362;
                        </span>
                      </div>
                      {isReadyToConvert && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300" variant="outline">
                          מוכנה להמרה
                        </Badge>
                      )}
                      {quote.converted_job_id && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300" variant="outline">
                          הומרה לעבודה
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
