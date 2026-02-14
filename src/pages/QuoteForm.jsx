import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getPriceWithVAT } from '@/utils/vat';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, Save, Loader2, Search, Plus, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import CreateNewClientDialog from "@/components/job/CreateNewClientDialog";
import { toast } from 'sonner';

const emptyLineItem = () => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unit_price: 0,
});

export default function QuoteForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoadingAuth } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const quoteId = urlParams.get('id');
  const preselectedClientId = urlParams.get('client_id');
  const isEditing = !!quoteId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    client_id: preselectedClientId || '',
    client_name: '',
    client_phone: '',
    notes: '',
  });

  const [lineItems, setLineItems] = useState([emptyLineItem()]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      if (isEditing) {
        const { data: quoteData, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', quoteId)
          .eq('owner_id', user.id)
          .single();
        if (error) throw error;

        if (quoteData) {
          if (quoteData.status !== 'draft') {
            toast.error('לא ניתן לערוך שורות כשההצעה אינה טיוטה');
            navigate(createPageUrl(`QuoteDetails?id=${quoteId}`));
            return;
          }
          if (quoteData.converted_job_id) {
            toast.error('הצעה שהומרה לעבודה אינה ניתנת לעריכה');
            navigate(createPageUrl(`QuoteDetails?id=${quoteId}`));
            return;
          }

          setFormData({
            client_id: quoteData.client_id || '',
            client_name: quoteData.client_name || '',
            client_phone: quoteData.client_phone || '',
            notes: quoteData.notes || '',
          });

          const items = Array.isArray(quoteData.line_items) && quoteData.line_items.length > 0
            ? quoteData.line_items.map(item => ({
              id: item.id || crypto.randomUUID(),
              description: item.description || '',
              quantity: Number(item.quantity) || 1,
              unit_price: Number(item.unit_price) || 0,
            }))
            : [emptyLineItem()];
          setLineItems(items);
        }
      } else if (preselectedClientId) {
        const client = (clientsData || []).find(c => c.id === preselectedClientId);
        if (client) {
          const displayName = client.client_type === 'company' ? client.company_name : client.contact_name;
          setFormData(prev => ({
            ...prev,
            client_id: client.id,
            client_name: displayName,
            client_phone: client.phone,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client) => {
    const displayName = client.client_type === 'company' ? client.company_name : client.contact_name;
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      client_name: displayName,
      client_phone: client.phone,
    }));
    setErrors(prev => ({ ...prev, client_id: null }));
    setClientPopoverOpen(false);
  };

  const handleClientCreated = (newClient) => {
    const displayName = newClient.client_type === 'company' ? newClient.company_name : newClient.contact_name;
    setClients(prev => [...prev, newClient]);
    setFormData(prev => ({
      ...prev,
      client_id: newClient.id,
      client_name: displayName,
      client_phone: newClient.phone,
    }));
    setErrors(prev => ({ ...prev, client_id: null }));
    setClientPopoverOpen(false);
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, emptyLineItem()]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length <= 1) {
      toast.error('חייב לפחות שורה אחת בהצעה');
      return;
    }
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const getLineTotal = (item) => {
    return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  };

  const getTotal = () => {
    return lineItems.reduce((sum, item) => sum + getLineTotal(item), 0);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.client_id) {
      newErrors.client_id = 'חובה לבחור לקוח';
    }

    const lineErrors = [];
    let hasLineError = false;
    lineItems.forEach((item, idx) => {
      const itemErrors = {};
      if (!item.description.trim()) {
        itemErrors.description = 'תיאור הוא שדה חובה';
        hasLineError = true;
      }
      if (Number(item.quantity) <= 0) {
        itemErrors.quantity = 'כמות חייבת להיות גדולה מ-0';
        hasLineError = true;
      }
      if (Number(item.unit_price) < 0) {
        itemErrors.unit_price = 'מחיר לא יכול להיות שלילי';
        hasLineError = true;
      }
      lineErrors[idx] = itemErrors;
    });

    if (hasLineError) {
      newErrors.lineItems = lineErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const total = getTotal();
      const cleanLineItems = lineItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        line_total: getLineTotal(item),
      }));

      const submitData = {
        client_id: formData.client_id,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        notes: formData.notes,
        line_items: cleanLineItems,
        total,
        status: 'draft',
      };

      if (isEditing) {
        const { error } = await supabase
          .from('quotes')
          .update(submitData)
          .eq('id', quoteId)
          .eq('owner_id', user.id);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        toast.success('נשמר בהצלחה');
        navigate(createPageUrl(`QuoteDetails?id=${quoteId}`));
      } else {
        const { data: newQuote, error } = await supabase
          .from('quotes')
          .insert([{ ...submitData, owner_id: user.id }])
          .select('id')
          .single();
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        toast.success('נשמר בהצלחה');
        navigate(createPageUrl(`QuoteDetails?id=${newQuote.id}`));
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('שגיאה בשמירה', {
        description: 'אירעה שגיאה בשמירת ההצעה. נסה שוב',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingAuth) return <LoadingSpinner />;
  if (!user) return null;
  if (loading) return <LoadingSpinner />;

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
            {isEditing ? 'עריכת טיוטת הצעה' : 'הצעת מחיר חדשה'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isEditing ? 'עדכן את פרטי ההצעה' : 'צור הצעת מחיר חדשה'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">לקוח *</CardTitle>
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
                  className={`w-full justify-between h-auto py-3 ${errors.client_id ? 'border-red-500' : ''}`}
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
            {errors.client_id && (
              <p className="text-sm text-red-600 mt-1">{errors.client_id}</p>
            )}
          </CardContent>
        </Card>

        <CreateNewClientDialog
          open={createClientDialogOpen}
          onOpenChange={setCreateClientDialogOpen}
          onClientCreated={handleClientCreated}
        />

        {/* Notes */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">הערות להצעה</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="הערות כלליות להצעת המחיר..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">שורות שירות</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="w-4 h-4 ml-1" />
              הוסף שורה
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((item, idx) => {
              const lineErrors = errors.lineItems?.[idx] || {};
              return (
                <div key={item.id} className="p-4 bg-slate-50 rounded-xl space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">שורה {idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 h-8 w-8"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>תיאור *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="תיאור השירות"
                      className={lineErrors.description ? 'border-red-500' : ''}
                    />
                    {lineErrors.description && (
                      <p className="text-xs text-red-600">{lineErrors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>כמות</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                        className={lineErrors.quantity ? 'border-red-500' : ''}
                        dir="ltr"
                      />
                      {lineErrors.quantity && (
                        <p className="text-xs text-red-600">{lineErrors.quantity}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>מחיר יחידה</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(item.id, 'unit_price', e.target.value)}
                        className={lineErrors.unit_price ? 'border-red-500' : ''}
                        dir="ltr"
                      />
                      {lineErrors.unit_price && (
                        <p className="text-xs text-red-600">{lineErrors.unit_price}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>סה״כ שורה</Label>
                      <div className="flex items-center h-10 px-3 bg-white border rounded-md text-slate-700 font-medium" dir="ltr">
                        {getLineTotal(item).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &#8362;
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="space-y-3 p-4 bg-slate-800 text-white rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm">סכום טרם מע״מ:</span>
                <span className="font-medium" dir="ltr">
                  {getTotal().toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &#8362;
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">מע״מ (18%):</span>
                <span className="font-medium" dir="ltr">
                  {(getTotal() * 0.18).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &#8362;
                </span>
              </div>
              <div className="border-t border-white/20 pt-3 flex items-center justify-between">
                <span className="text-lg font-bold">סה״כ הצעה:</span>
                <span className="text-2xl font-bold" dir="ltr">
                  {(getTotal() * 1.18).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &#8362;
                </span>
              </div>
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
                {isEditing ? 'שמור שינויים' : 'שמור טיוטה'}
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
