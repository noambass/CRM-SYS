import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, MapPin, Calendar, Save, Loader2, Search, Shield,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import CreateNewClientDialog from "@/components/job/CreateNewClientDialog";
import GooglePlacesInput from "@/components/shared/GooglePlacesInput";
import { he } from 'date-fns/locale';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { JOB_STATUSES } from '@/components/shared/StatusFlow';

const defaultPriorityOptions = [
  { value: 'normal', label: 'לא דחוף' },
  { value: 'urgent', label: 'דחוף' },
];

const SERVICE_TYPES = [
  { value: 'bathtub', label: 'אמבטיה' },
  { value: 'sink', label: 'כיור' },
  { value: 'ceramic', label: 'קרמיקה' },
  { value: 'other', label: 'אחר' },
];

export default function JobForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoadingAuth } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  const preselectedClientId = urlParams.get('client_id');
  const isEditing = !!jobId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [configs, setConfigs] = useState({});
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [showAdditionalContact, setShowAdditionalContact] = useState(false);
  const [contactErrors, setContactErrors] = useState({});

  const [formData, setFormData] = useState({
    client_id: preselectedClientId || '',
    client_name: '',
    client_phone: '',
    contact_name: '',
    contact_phone: '',
    primary_contact_name: '',
    primary_contact_phone: '',
    title: '',
    description: '',
    service_type: '',
    status: JOB_STATUSES.QUOTE,
    priority: 'normal',
    address: '',
    city: '',
    address_place_id: null,
    address_lat: null,
    address_lng: null,
    warranty: true,
    warranty_note: '',
    scheduled_date: '',
    scheduled_time: '',
    assigned_to: '',
    assigned_to_name: '',
    notes: '',
    internal_notes: '',
  });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  useEffect(() => {
    if (!formData.client_id) {
      setShowAdditionalContact(true);
    }
  }, [formData.client_id]);

  const loadData = async () => {
    if (!user) return;
    try {
      const presetDate = urlParams.get('date');

      const [clientsResponse, employeesRes, configsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('employees')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('app_configs')
          .select('config_type, config_data')
          .eq('owner_id', user.id)
          .in('config_type', ['job_statuses', 'job_priorities'])
      ]);
      if (clientsResponse.error) throw clientsResponse.error;
      if (employeesRes.error) throw employeesRes.error;
      if (configsRes.error) throw configsRes.error;
      const clientsData = clientsResponse.data || [];
      setClients(clientsData);
      const employeesData = (employeesRes.data || []).map((employee) => ({
        ...employee,
        full_name: employee.name || employee.full_name || '',
      }));
      setEmployees(employeesData);

      if (presetDate && !isEditing) {
        setFormData(prev => ({ ...prev, scheduled_date: presetDate }));
      }

      const configMap = {};
      (configsRes.data || []).forEach(config => {
        if (config.config_data?.statuses) {
          configMap[config.config_type] = config.config_data.statuses;
        }
      });
      setConfigs(configMap);

      if (isEditing) {
        const { data: jobData, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .eq('owner_id', user.id)
          .single();
        if (error) throw error;
        if (jobData) {
          const scheduledDate = jobData.scheduled_at ? new Date(jobData.scheduled_at) : null;

          setFormData({
            client_id: jobData.client_id || '',
            client_name: jobData.client_name || '',
            client_phone: jobData.client_phone || '',
            contact_name: jobData.contact_name || '',
            contact_phone: jobData.contact_phone || '',
            primary_contact_name: jobData.primary_contact_name || '',
            primary_contact_phone: jobData.primary_contact_phone || '',
            title: jobData.title || '',
            description: jobData.description || '',
            service_type: jobData.service_type || '',
            status: jobData.status || JOB_STATUSES.QUOTE,
            priority: jobData.priority || 'normal',
            address: jobData.address || '',
            city: jobData.city || '',
            address_place_id: jobData.address_place_id || null,
            address_lat: jobData.address_lat || null,
            address_lng: jobData.address_lng || null,
            warranty: jobData.warranty !== undefined ? jobData.warranty : true,
            warranty_note: jobData.warranty_note || '',
            scheduled_date: jobData.scheduled_date || (scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : ''),
            scheduled_time: jobData.scheduled_time || (scheduledDate ? format(scheduledDate, 'HH:mm') : ''),
            assigned_to: jobData.assigned_to || '',
            assigned_to_name: jobData.assigned_to_name || '',
            notes: jobData.notes || '',
            internal_notes: jobData.internal_notes || '',
          });
        }
      } else if (preselectedClientId) {
        const client = clientsData.find(c => c.id === preselectedClientId);
        if (client) {
          const displayName = client.client_type === 'company' ? client.company_name : client.contact_name;
          setFormData(prev => ({
            ...prev,
            client_id: client.id,
            client_name: displayName,
            client_phone: client.phone,
            address: client.address || '',
            city: client.city || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת נתונים', {
        description: 'נסה שוב בעוד רגע',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'contact_name' && value) {
        newData.primary_contact_name = newData.contact_name;
      }
      return newData;
    });
  };

  const handleClientSelect = (client) => {
    const displayName = client.client_type === 'company' ? client.company_name : client.contact_name;
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      client_name: displayName,
      client_phone: client.phone,
      address: prev.address || client.address || '',
      city: prev.city || client.city || ''
    }));
    setShowAdditionalContact(false);
    setContactErrors(prev => ({ ...prev, contact_name: null }));
    setClientPopoverOpen(false);
  };

  const handleEmployeeSelect = (employee) => {
    setFormData(prev => ({
      ...prev,
      assigned_to: employee.id,
      assigned_to_name: employee.full_name
    }));
    setEmployeePopoverOpen(false);
  };

  const handleClientCreated = (newClient) => {
    const displayName = newClient.client_type === 'company' ? newClient.company_name : newClient.contact_name;
    setClients(prev => [...prev, newClient]);
    setFormData(prev => ({
      ...prev,
      client_id: newClient.id,
      client_name: displayName,
      client_phone: newClient.phone
    }));
    setShowAdditionalContact(false);
    setContactErrors(prev => ({ ...prev, contact_name: null }));
    setClientPopoverOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      if (!formData.client_id && !formData.contact_name.trim()) {
        setShowAdditionalContact(true);
        setContactErrors(prev => ({ ...prev, contact_name: 'שם איש קשר הוא שדה חובה כשאין לקוח' }));
        toast.error('שגיאה בשמירה', {
          description: 'אנא הזן שם איש קשר או בחר לקוח',
          duration: 5000
        });
        setSaving(false);
        return;
      }

      if (!formData.title || formData.title.length < 3) {
        toast.error('שגיאה בשמירה', {
          description: 'כותרת חייבת להכיל לפחות 3 תווים',
          duration: 5000
        });
        setSaving(false);
        return;
      }

      const submitData = { ...formData };

      /* Auto-suggest status change when scheduling */
      if ((formData.scheduled_date && formData.scheduled_time) &&
          (formData.status === JOB_STATUSES.QUOTE || formData.status === JOB_STATUSES.WAITING_SCHEDULE)) {
        submitData.status = JOB_STATUSES.WAITING_EXECUTION;
      }

      submitData.scheduled_date = submitData.scheduled_date?.trim() || null;
      submitData.scheduled_time = submitData.scheduled_time?.trim() || null;
      if (submitData.scheduled_date && submitData.scheduled_time) {
        submitData.scheduled_at = new Date(`${submitData.scheduled_date}T${submitData.scheduled_time}`).toISOString();
      } else {
        submitData.scheduled_at = null;
      }

      if (submitData.status === 'done') {
        submitData.completed_at = submitData.completed_at || new Date().toISOString();
      } else {
        submitData.completed_at = null;
      }

      /* Create new contact as client if contact_name exists and is not already in clients */
      if (!isEditing && formData.contact_name && !formData.client_id) {
        const { data: newContact, error } = await supabase
          .from('clients')
          .insert([{
            owner_id: user.id,
            contact_name: formData.contact_name,
            phone: formData.contact_phone || '',
            client_type: 'private',
            tags: ['איש קשר'],
            status: 'active'
          }])
          .select('*')
          .single();
        if (error) throw error;
        submitData.client_id = newContact.id;
        submitData.client_name = formData.contact_name;
        submitData.client_phone = formData.contact_phone;
        setClients(prev => [...prev, newContact]);
      }

      if (isEditing) {
        const { error } = await supabase
          .from('jobs')
          .update(submitData)
          .eq('id', jobId)
          .eq('owner_id', user.id);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });

        toast.success('העבודה עודכנה בהצלחה', {
          description: `${submitData.title} עודכנה במערכת`,
          duration: 4000
        });
      } else {
        const { data: newJob, error } = await supabase
          .from('jobs')
          .insert([{ ...submitData, owner_id: user.id }])
          .select('id')
          .single();
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });

        if (submitData.scheduled_date && submitData.scheduled_time) {
          toast.success('העבודה נוצרה ותוזמנה בהצלחה', {
            description: `${submitData.title} תבוצע ב-${format(new Date(submitData.scheduled_date), 'dd/MM/yyyy')} בשעה ${submitData.scheduled_time}`,
            duration: 5000,
            action: {
              label: 'לוח שנה',
              onClick: () => navigate(createPageUrl('Calendar'))
            }
          });
        } else {
          toast.success('העבודה נוצרה בהצלחה', {
            description: `${submitData.title} נוצרה - זכרו לתזמן אותה`,
            duration: 5000,
            action: {
              label: 'ראה עבודה',
              onClick: () => navigate(createPageUrl(`JobDetails?id=${newJob?.id}`))
            }
          });
        }
      }

      navigate(createPageUrl('Jobs'));
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('שגיאה בשמירה', {
        description: 'אירעה שגיאה בשמירת העבודה. נסה שוב',
        duration: 6000
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;

  const priorityOptions = configs.job_priorities || defaultPriorityOptions;

  return (
    <div dir="rtl" className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEditing ? 'עריכת עבודה' : 'עבודה חדשה'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isEditing ? 'עדכן את פרטי העבודה' : 'צור עבודה חדשה במערכת'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">לקוח</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateClientDialogOpen(true)}
            >
              + לקוח חדש
            </Button>
          </CardHeader>
          <CardContent>
            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-auto py-3"
                >
                  {formData.client_name ? (
                    <div className="text-right">
                      <p className="font-medium">{formData.client_name}</p>
                      <p className="text-sm text-slate-500" dir="ltr">{formData.client_phone}</p>
                    </div>
                  ) : (
                    <span className="text-slate-500">בחר לקוח...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command dir="rtl">
                  <CommandInput placeholder="חפש לקוח..." />
                  <CommandList>
                    <CommandEmpty>לא נמצאו לקוחות</CommandEmpty>
                    <CommandGroup>
                      {clients.map((client) => {
                        const displayName = client.client_type === 'company' ? client.company_name : client.contact_name;
                        return (
                          <CommandItem
                            key={client.id}
                            onSelect={() => handleClientSelect(client)}
                            className="cursor-pointer"
                          >
                            <div>
                              <p className="font-medium">{displayName}</p>
                              <p className="text-sm text-slate-500" dir="ltr">{client.phone}</p>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <CreateNewClientDialog
          open={createClientDialogOpen}
          onOpenChange={setCreateClientDialogOpen}
          onClientCreated={handleClientCreated}
        />

        {/* Job Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">פרטי העבודה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">כותרת *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="תיאור קצר של העבודה"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">תיאור מפורט</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="תיאור מלא של העבודה..."
                rows={4}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>סוג שירות</Label>
                <Select value={formData.service_type} onValueChange={(v) => handleChange('service_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג שירות..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>עדיפות</Label>
                <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(!formData.client_id || showAdditionalContact) && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-600 mb-4">
                  {formData.client_id ? 'איש קשר נוסף בעבודה' : 'איש קשר בעבודה'}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">
                      {formData.client_id ? 'שם איש קשר' : 'שם איש קשר *'}
                    </Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => {
                        handleChange('contact_name', e.target.value);
                        if (contactErrors.contact_name) {
                          setContactErrors(prev => ({ ...prev, contact_name: null }));
                        }
                        setFormData(prev => ({ ...prev, primary_contact_name: e.target.value }));
                      }}
                      placeholder="שם איש קשר"
                      required={!formData.client_id}
                    />
                    {contactErrors.contact_name && (
                      <p className="text-xs text-red-600">{contactErrors.contact_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">טלפון איש קשר</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => {
                        handleChange('contact_phone', e.target.value);
                        setFormData(prev => ({ ...prev, primary_contact_phone: e.target.value }));
                      }}
                      placeholder="טלפון איש הקשר"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.client_id && (
              <button
                type="button"
                onClick={() => setShowAdditionalContact(!showAdditionalContact)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-2"
              >
                {showAdditionalContact ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    הסתר איש קשר נוסף
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    הוסף איש קשר נוסף
                  </>
                )}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              מיקום
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">כתובת</Label>
              <GooglePlacesInput
                value={formData.address}
                onChangeText={(text) => handleChange('address', text)}
                onPlaceSelected={({ placeId, lat, lng }) => {
                  handleChange('address_place_id', placeId);
                  handleChange('address_lat', lat);
                  handleChange('address_lng', lng);
                }}
                placeholder="רחוב, מספר בית"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">עיר</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="עיר"
              />
            </div>
          </CardContent>
        </Card>

        {/* Warranty */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              אחריות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>האם העבודה באחריות?</Label>
              <Select
                value={formData.warranty ? 'yes' : 'no'}
                onValueChange={(v) => handleChange('warranty', v === 'yes')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">כן</SelectItem>
                  <SelectItem value="no">לא</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!formData.warranty && (
              <div className="space-y-2">
                <Label htmlFor="warranty_note">סיבה / הערה</Label>
                <Textarea
                  id="warranty_note"
                  value={formData.warranty_note}
                  onChange={(e) => handleChange('warranty_note', e.target.value)}
                  placeholder="הסבר מדוע העבודה אינה באחריות..."
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              תזמון
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>תאריך</Label>
                <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(true)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-right flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">
                      {formData.scheduled_date ? format(new Date(formData.scheduled_date), 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך...'}
                    </span>
                  </button>
                  <DialogContent className="w-auto">
                    <DialogHeader>
                      <DialogTitle>בחר תאריך</DialogTitle>
                    </DialogHeader>
                    <DatePicker
                      mode="single"
                      selected={formData.scheduled_date ? new Date(formData.scheduled_date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          handleChange('scheduled_date', format(date, 'yyyy-MM-dd'));
                          setDatePickerOpen(false);
                        }
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                <Label>שעה</Label>
                <Dialog open={timePickerOpen} onOpenChange={setTimePickerOpen}>
                  <button
                    type="button"
                    onClick={() => setTimePickerOpen(true)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-right flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">
                      {formData.scheduled_time || 'בחר שעה...'}
                    </span>
                  </button>
                  <DialogContent className="w-auto">
                    <DialogHeader>
                      <DialogTitle>בחר שעה</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-2 p-4 max-h-96 overflow-y-auto">
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
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              handleChange('scheduled_time', time);
                              setTimePickerOpen(false);
                            }}
                            className={`p-2 rounded border text-sm font-medium transition-colors ${
                              formData.scheduled_time === time
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {time}
                          </button>
                        ));
                      })()}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
              <p className="text-sm">
                <span className="font-medium text-slate-700">סטטוס נוכחי:</span>
                <span className="text-slate-700 mr-2">
                  {formData.scheduled_date && formData.scheduled_time ? 'מחכה לביצוע' : 'הצעת מחיר'}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">הסטטוס נקבע אוטומטית לפי הזנת תאריך ושעה</p>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">הערות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="הערות על העבודה..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_notes">הערות פנימיות</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                onChange={(e) => handleChange('internal_notes', e.target.value)}
                placeholder="הערות פנימיות (לא נראות ללקוח)..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={saving}
            style={{ backgroundColor: '#00214d' }}
            className="flex-1 hover:opacity-90"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                {isEditing ? 'שמור שינויים' : 'צור עבודה'}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            ביטול
          </Button>
        </div>
      </form>
    </div>
  );
}
