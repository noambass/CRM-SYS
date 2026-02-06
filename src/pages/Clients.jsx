import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { 
  Users, Search, Plus, Phone, Building2, MapPin,
  MoreVertical, Edit, Trash2, MessageCircle, Headphones,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ClientTypeBadge, ClientStatusBadge } from "@/components/ui/DynamicStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function Clients() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [statusConfigs, setStatusConfigs] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [clientToDelete, setClientToDelete] = useState(null);
   const [expandedClientId, setExpandedClientId] = useState(null);
   const [clientJobs, setClientJobs] = useState({});

  useEffect(() => {
    if (!user) return;
    loadClients();
  }, [user]);

  useEffect(() => {
    filterClients();
  }, [clients, searchQuery, typeFilter, statusFilters]);

  useEffect(() => {
    if (!user) return;
    loadStatusConfigs();
    setStatusFilters(new Set());
  }, [typeFilter, user]);

  const loadStatusConfigs = async () => {
    if (!user) return;
    try {
      const configType = typeFilter === 'company' ? 'client_statuses_company' : 
                        typeFilter === 'private' ? 'client_statuses_private' :
                        typeFilter === 'customer_service' ? 'client_statuses_customer_service' : null;
      
      if (!configType || typeFilter === 'all') {
        // When showing all, combine all type configs
        const { data, error } = await supabase
          .from('app_configs')
          .select('config_type, config_data')
          .eq('owner_id', user.id)
          .in('config_type', [
            'client_statuses_private',
            'client_statuses_company',
            'client_statuses_customer_service'
          ]);
        if (error) throw error;
        
        const allStatuses = new Map();

        (data || []).forEach((config) => {
          if (config.config_data?.statuses) {
            config.config_data.statuses.forEach(s => allStatuses.set(s.value, s));
          }
        });
        
        if (allStatuses.size > 0) {
          setStatusConfigs(Array.from(allStatuses.values()));
        } else {
          setStatusConfigs([
            { value: 'active', label: 'פעיל' },
            { value: 'inactive', label: 'לא פעיל' }
          ]);
        }
      } else {
        const { data, error } = await supabase
          .from('app_configs')
          .select('config_data')
          .eq('owner_id', user.id)
          .eq('config_type', configType)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data?.config_data?.statuses) {
          setStatusConfigs(data.config_data.statuses);
        } else {
          setStatusConfigs([
            { value: 'active', label: 'פעיל' },
            { value: 'inactive', label: 'לא פעיל' }
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading status configs:', error);
      setStatusConfigs([
        { value: 'active', label: 'פעיל' },
        { value: 'inactive', label: 'לא פעיל' }
      ]);
    }
  };

  const loadClients = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.contact_name?.toLowerCase().includes(query) ||
        c.company_name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.city?.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.client_type === typeFilter);
    }

    // Only apply status filter if at least one status is selected
    if (statusFilters.size > 0) {
      filtered = filtered.filter(c => statusFilters.has(c.status));
    }

    setFilteredClients(filtered);
  };

  const toggleClientExpand = async (clientId) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
    } else {
      if (!clientJobs[clientId] && user) {
        try {
          const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('owner_id', user.id)
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          setClientJobs(prev => ({ ...prev, [clientId]: data || [] }));
        } catch (error) {
          console.error('Error loading client jobs:', error);
          setClientJobs(prev => ({ ...prev, [clientId]: [] }));
        }
      } else if (!clientJobs[clientId]) {
        setClientJobs(prev => ({ ...prev, [clientId]: [] }));
      }
      setExpandedClientId(clientId);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete || !user) return;
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id)
        .eq('owner_id', user.id);

      if (error) throw error;
      setClients(clients.filter(c => c.id !== clientToDelete.id));
    } catch (error) {
      console.error('Error deleting client:', error);
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
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
    <div dir="rtl" className="p-3 lg:p-8 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">לקוחות</h1>
          <p className="text-slate-500 mt-1">{clients.length} לקוחות במערכת</p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl('ClientForm'))}
          style={{ backgroundColor: '#00214d' }}
          className="hover:opacity-90 shadow-lg hidden lg:flex"
        >
          <Plus className="w-4 h-4 ml-2" />
          לקוח חדש
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, טלפון או עיר..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 border-slate-200"
              />
            </div>
            <div className="flex flex-col gap-4">
              <Tabs value={typeFilter} onValueChange={setTypeFilter} dir="rtl">
                <TabsList className="bg-slate-100 justify-start">
                  <TabsTrigger value="all">הכל</TabsTrigger>
                  <TabsTrigger value="private">פרטי</TabsTrigger>
                  <TabsTrigger value="company">חברות</TabsTrigger>
                  <TabsTrigger value="customer_service">שירות לקוחות</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex flex-wrap items-center gap-4">
                {statusConfigs.map(status => {
                  const count = clients.filter(c => c.status === status.value).length;
                  const isChecked = statusFilters.has(status.value);
                  return (
                    <div key={status.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const newFilters = new Set(statusFilters);
                          if (checked) {
                            newFilters.add(status.value);
                          } else {
                            newFilters.delete(status.value);
                          }
                          setStatusFilters(newFilters);
                        }}
                      />
                      <Label htmlFor={`status-${status.value}`} className="flex items-center gap-2 cursor-pointer mb-0">
                        {status.color && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: status.color }}
                          />
                        )}
                        <span className="text-sm">{status.label} ({count})</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="אין לקוחות"
          description={searchQuery ? 'לא נמצאו לקוחות התואמים לחיפוש' : 'התחל להוסיף לקוחות למערכת'}
          actionLabel={!searchQuery ? 'הוסף לקוח ראשון' : undefined}
          onAction={!searchQuery ? () => navigate(createPageUrl('ClientForm')) : undefined}
        />
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200">
              {filteredClients.map((client) => (
                <React.Fragment key={client.id}>
                  <div
                    className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 transition-colors group gap-2 overflow-hidden"
                  >
                  <div 
                    className="flex-1 flex items-center gap-2 sm:gap-4 cursor-pointer min-w-0"
                    onClick={() => navigate(createPageUrl(`ClientDetails?id=${client.id}`))}
                  >
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarFallback className={`${
                        client.client_type === 'company' ? 'bg-indigo-100 text-indigo-700' :
                        client.client_type === 'customer_service' ? 'bg-purple-100 text-purple-700' :
                        'bg-teal-100 text-teal-700'
                      }`}>
                        {client.client_type === 'company' ? (
                          <Building2 className="w-5 h-5" />
                        ) : client.client_type === 'customer_service' ? (
                          <Headphones className="w-5 h-5" />
                        ) : (
                          client.contact_name?.charAt(0) || '?'
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">
                        {client.client_type === 'company' || client.client_type === 'customer_service' ? client.company_name : client.contact_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-3 mt-1 text-xs sm:text-sm text-slate-600">
                        <div className="flex items-center gap-1" dir="ltr">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {client.phone}
                        </div>
                        {client.city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {client.city}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <ClientTypeBadge type={client.client_type} />
                          <ClientStatusBadge status={client.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 flex-wrap justify-end">
                     {(client.total_jobs || 0) > 0 && (
                       <Button
                         onClick={(e) => {
                           e.stopPropagation();
                           toggleClientExpand(client.id);
                         }}
                         variant="ghost"
                         size="icon"
                         className="text-slate-600 hover:text-slate-800"
                       >
                         {expandedClientId === client.id ? (
                           <ChevronUp className="w-5 h-5" />
                         ) : (
                           <ChevronDown className="w-5 h-5" />
                         )}
                       </Button>
                     )}
                     <div className="text-center hidden sm:block">
                       <p className="text-xs text-slate-500">עבודות</p>
                       <p className="text-lg font-semibold text-slate-800">{client.total_jobs || 0}</p>
                     </div>
                     <Button
                       onClick={(e) => {
                         e.stopPropagation();
                         navigate(createPageUrl(`JobForm?client_id=${client.id}`));
                       }}
                       size="sm"
                       className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs sm:text-sm whitespace-nowrap"
                     >
                       <Plus className="w-4 h-4 ml-1" />
                       <span className="hidden sm:inline">הוסף עבודה</span>
                       <span className="sm:hidden">+</span>
                     </Button>
                    <DropdownMenu dir="rtl">
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(createPageUrl(`ClientForm?id=${client.id}`));
                        }}>
                          <Edit className="w-4 h-4 ml-2" />
                          עריכה
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          openWhatsApp(client.phone);
                        }}>
                          <MessageCircle className="w-4 h-4 ml-2" />
                          שלח וואטסאפ
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientToDelete(client);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  </div>
                  {expandedClientId === client.id && clientJobs[client.id] && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                      {clientJobs[client.id].length === 0 ? (
                        <p className="text-sm text-slate-500 italic">אין עבודות לקוח זה</p>
                      ) : (
                        <div className="space-y-2">
                          {clientJobs[client.id].map((job) => (
                            <div
                              key={job.id}
                              onClick={() => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
                              className="flex items-center justify-between p-2 bg-white rounded hover:bg-slate-100 cursor-pointer transition-colors border border-slate-200"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 text-sm truncate">{job.title}</p>
                                <p className="text-xs text-slate-500 truncate">{job.address}</p>
                              </div>
                              <div className="ml-2 flex-shrink-0">
                                <span className="text-xs px-2 py-1 rounded font-medium bg-slate-200 text-slate-700">
                                  {job.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  </React.Fragment>
                  ))}
                  </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת לקוח</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הלקוח "{clientToDelete?.contact_name || clientToDelete?.company_name}"? פעולה זו אינה הפיכה.
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
