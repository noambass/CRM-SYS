import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { JOB_STATUS_OPTIONS } from '@/config/legacyUiConfig';
import { 
  Briefcase, Search, Plus,
  Filter, List, BarChart3, Users as UsersIcon, Clock as ClockIcon
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EnhancedEmptyState from "@/components/shared/EnhancedEmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { JobsListView, JobsByStatusView, JobsByClientsView, JobsByDateView } from "@/components/jobs/JobsViewMode";

export default function Jobs() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('status'); // list, status, clients, date
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [statusOptions, setStatusOptions] = useState(JOB_STATUS_OPTIONS);

  useEffect(() => {
    if (!user) return;
    loadData();
    loadStatusOptions();
  }, [user]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, statusFilter]);

  const loadData = async () => {
    if (!user) return;
    try {
      const jobsResponse = await supabase
        .from('jobs')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (jobsResponse.error) throw jobsResponse.error;
      setJobs(jobsResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת עבודות', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatusOptions = async () => {
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
        setStatusOptions(options);
      } else {
        setStatusOptions(JOB_STATUS_OPTIONS);
      }
    } catch (error) {
      console.error('Error loading status configs:', error);
      setStatusOptions(JOB_STATUS_OPTIONS);
    }
  };

  const loadJobs = async () => {
    loadData();
  };

  const filterJobs = () => {
    let filtered = [...jobs];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(j => 
        j.title?.toLowerCase().includes(query) ||
        j.client_name?.toLowerCase().includes(query) ||
        j.address?.toLowerCase().includes(query) ||
        j.city?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(j => j.status === statusFilter);
    }

    setFilteredJobs(filtered);
  };

  const handleDelete = async () => {
    if (!jobToDelete || !user) return;
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobToDelete.id)
        .eq('owner_id', user.id);
      if (error) throw error;
      setJobs(jobs.filter(j => j.id !== jobToDelete.id));
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('שגיאה במחיקת עבודה', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    } finally {
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  const updateJobStatus = async (job, newStatus) => {
    if (!user) return;
    try {
      const updateData = {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      };
      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', job.id)
        .eq('owner_id', user.id);
      if (error) throw error;
      setJobs(jobs.map(j => j.id === job.id ? { ...j, ...updateData } : j));
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('שגיאה בעדכון סטטוס', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    }
  };

  const openWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;

  return (
    <div dir="rtl" className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">עבודות</h1>
          <p className="text-slate-500 mt-1">{jobs.length} עבודות במערכת</p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl('JobForm'))}
          style={{ backgroundColor: '#00214d' }}
          className="hover:opacity-90 shadow-lg"
        >
          <Plus className="w-4 h-4 ml-2" />
          עבודה חדשה
        </Button>
      </div>

      {/* Filters & View Options */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי כותרת, לקוח או כתובת..."
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
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600">תצוגה:</span>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                style={viewMode === 'list' ? { backgroundColor: '#00214d' } : {}}
              >
                <List className="w-4 h-4 ml-1" />
                רשימה
              </Button>
              <Button
                variant={viewMode === 'status' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('status')}
                style={viewMode === 'status' ? { backgroundColor: '#00214d' } : {}}
              >
                <BarChart3 className="w-4 h-4 ml-1" />
                לפי סטטוס
              </Button>
              <Button
                variant={viewMode === 'clients' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('clients')}
                style={viewMode === 'clients' ? { backgroundColor: '#00214d' } : {}}
              >
                <UsersIcon className="w-4 h-4 ml-1" />
                לפי לקוחות
              </Button>
              <Button
                variant={viewMode === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('date')}
                style={viewMode === 'date' ? { backgroundColor: '#00214d' } : {}}
              >
                <ClockIcon className="w-4 h-4 ml-1" />
                לפי תאריך
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        searchQuery || statusFilter !== 'all' ? (
          <EnhancedEmptyState
            icon={Briefcase}
            title="לא נמצאו תוצאות התואמות לסינון"
            description="נסה לשנות את הסינון או החיפוש כדי לראות יותר עבודות"
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
            icon={Briefcase}
            title="אין עבודות עדיין"
            description="כל העבודות שתוסיף יופיעו כאן. התחל על ידי יצירת העבודה הראשונה"
            primaryAction={{
              label: 'צור עבודה ראשונה',
              onClick: () => navigate(createPageUrl('JobForm'))
            }}
          />
        )
      ) : viewMode === 'list' ? (
        <JobsListView jobs={filteredJobs} navigate={navigate} />
      ) : viewMode === 'status' ? (
        <JobsByStatusView jobs={filteredJobs} navigate={navigate} />
      ) : viewMode === 'clients' ? (
        <JobsByClientsView jobs={filteredJobs} navigate={navigate} />
      ) : (
        <JobsByDateView jobs={filteredJobs} navigate={navigate} />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת עבודה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את העבודה "{jobToDelete?.title}"? פעולה זו אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
