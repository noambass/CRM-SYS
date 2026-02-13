import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// Default fallback configurations
const defaultJobStatuses = {
  quote: { label: 'הצעת מחיר', color: '#6366f1' },
  waiting_schedule: { label: 'ממתין לתזמון', color: '#f59e0b' },
  waiting_execution: { label: 'ממתין לביצוע', color: '#3b82f6' },
  done: { label: 'הושלם', color: '#10b981' }
};

const defaultJobPriorities = {
  normal: { label: 'לא דחוף', color: '#64748b' },
  not_urgent: { label: 'לא דחוף', color: '#64748b' },
  low: { label: 'נמוכה', color: '#64748b' },
  medium: { label: 'בינונית', color: '#3b82f6' },
  high: { label: 'גבוהה', color: '#f97316' },
  urgent: { label: 'דחוף', color: '#ef4444' },
};

const defaultClientStatuses = {
  active: { label: 'פעיל', color: '#10b981' },
  inactive: { label: 'לא פעיל', color: '#64748b' },
};

const defaultInvoiceStatuses = {
  not_created: { label: 'לא נוצרה', color: '#64748b' },
  created: { label: 'נוצרה', color: '#3b82f6' },
  sent: { label: 'נשלחה', color: '#8b5cf6' },
  paid: { label: 'שולמה', color: '#10b981' },
};

const cachedConfigsByUser = new Map();
const pendingConfigsByUser = new Map();

async function loadConfigs(userId) {
  if (!userId) return {};
  if (cachedConfigsByUser.has(userId)) return cachedConfigsByUser.get(userId);
  if (pendingConfigsByUser.has(userId)) return pendingConfigsByUser.get(userId);

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('app_configs')
        .select('config_type, config_data')
        .eq('owner_id', userId);
      if (error) throw error;

      const configMap = {};
      (data || []).forEach((config) => {
        if (config.config_data?.statuses) {
          configMap[config.config_type] = {};
          config.config_data.statuses.forEach((status) => {
            configMap[config.config_type][status.value] = {
              label: status.label,
              color: status.color
            };
          });
        }
      });

      cachedConfigsByUser.set(userId, configMap);
      return configMap;
    } catch (error) {
      console.error('Error loading configs:', error);
      return {};
    } finally {
      pendingConfigsByUser.delete(userId);
    }
  })();

  pendingConfigsByUser.set(userId, promise);
  return promise;
}

export function JobStatusBadge({ status }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setConfig(null);
      return () => {};
    }
    loadConfigs(user.id).then(configs => {
      if (mounted) setConfig(configs.job_statuses || {});
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const statusConfig = (config && config[status]) || defaultJobStatuses[status] || { label: status, color: '#64748b' };

  return (
    <Badge 
      variant="outline" 
      style={{
        backgroundColor: `${statusConfig.color}20`,
        color: statusConfig.color,
        borderColor: statusConfig.color
      }}
      className="font-medium"
    >
      {statusConfig.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setConfig(null);
      return () => {};
    }
    loadConfigs(user.id).then(configs => {
      if (mounted) setConfig(configs.job_priorities || {});
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Only show badge if priority is defined in config (not in defaults)
  if (config && !config[priority]) {
    return null;
  }

  const priorityConfig = (config && config[priority]) || defaultJobPriorities[priority] || { label: priority, color: '#64748b' };

  return (
    <Badge 
      variant="outline"
      style={{
        backgroundColor: `${priorityConfig.color}20`,
        color: priorityConfig.color,
        borderColor: priorityConfig.color
      }}
      className="font-medium"
    >
      {priorityConfig.label}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setConfig(null);
      return () => {};
    }
    loadConfigs(user.id).then(configs => {
      if (mounted) setConfig(configs.invoice_statuses || {});
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const statusConfig = (config && config[status]) || defaultInvoiceStatuses[status] || { label: status, color: '#64748b' };

  return (
    <Badge 
      variant="outline"
      style={{
        backgroundColor: `${statusConfig.color}20`,
        color: statusConfig.color,
        borderColor: statusConfig.color
      }}
      className="font-medium"
    >
      {statusConfig.label}
    </Badge>
  );
}

export function ClientStatusBadge({ status, clientType }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setConfig(null);
      return () => {};
    }
    loadConfigs(user.id).then(configs => {
      if (!mounted) return;
      // Merge all client type statuses for lookup
      const privateStatuses = configs.client_statuses_private || {};
      const companyStatuses = configs.client_statuses_company || {};
      const customerServiceStatuses = configs.client_statuses_customer_service || {};
      const mergedStatuses = { ...privateStatuses, ...companyStatuses, ...customerServiceStatuses };
      setConfig(mergedStatuses);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const statusConfig = (config && config[status]) || defaultClientStatuses[status] || { label: status, color: '#64748b' };

  return (
    <Badge 
      variant="outline"
      style={{
        backgroundColor: `${statusConfig.color}20`,
        color: statusConfig.color,
        borderColor: statusConfig.color
      }}
      className="font-medium"
    >
      {statusConfig.label}
    </Badge>
  );
}

export function ClientTypeBadge({ type }) {
  const config = type === 'company' 
    ? { label: 'חברה', color: '#6366f1' }
    : type === 'customer_service'
    ? { label: 'שירות לקוחות', color: '#a855f7' }
    : { label: 'פרטי', color: '#14b8a6' };
  
  return (
    <Badge 
      variant="outline"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        borderColor: config.color
      }}
      className="font-medium"
    >
      {config.label}
    </Badge>
  );
}

// Clear cache function for when configs are updated
export function clearConfigCache() {
  cachedConfigsByUser.clear();
  pendingConfigsByUser.clear();
}
