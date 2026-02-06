import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export default function CreateNewClientDialog({ open, onOpenChange, onClientCreated }) {
  const { user, isLoadingAuth } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_type: 'private',
    contact_name: '',
    phone: '',
    company_name: '',
    email: '',
    address: '',
    city: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (isLoadingAuth || !user) return;
    if (!formData.contact_name || !formData.phone) return;

    setSaving(true);
    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert([{
          owner_id: user.id,
          client_type: formData.client_type,
          contact_name: formData.contact_name,
          phone: formData.phone,
          company_name: formData.client_type === 'company' ? formData.company_name : '',
          email: formData.email,
          address: formData.address,
          city: formData.city,
          status: 'active'
        }])
        .select('*')
        .single();
      if (error) throw error;

      // Call the callback with the new client
      onClientCreated(newClient);

      // Reset form
      setFormData({
        client_type: 'private',
        contact_name: '',
        phone: '',
        company_name: '',
        email: '',
        address: '',
        city: '',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating client:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">הוסף לקוח חדש</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-right">
          <div className="space-y-2">
            <Label>סוג לקוח</Label>
            <Select value={formData.client_type} onValueChange={(v) => handleChange('client_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">פרטי</SelectItem>
                <SelectItem value="company">חברה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.client_type === 'company' && (
            <div className="space-y-2">
              <Label htmlFor="company_name">שם החברה *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="שם החברה"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contact_name">שם איש קשר / שם *</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => handleChange('contact_name', e.target.value)}
              placeholder="שם"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">טלפון *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="טלפון"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="אימייל"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">כתובת</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="כתובת"
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
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            onClick={handleSubmit}
            disabled={saving || !formData.contact_name || !formData.phone}
            style={{ backgroundColor: '#00214d' }}
            className="hover:opacity-90"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                יוצר...
              </>
            ) : (
              'צור לקוח'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
