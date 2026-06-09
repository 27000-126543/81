import dayjs from 'dayjs';

export const formatDate = (
  date: string | Date | number,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

export const formatDateOnly = (date: string | Date | number): string => {
  return formatDate(date, 'YYYY-MM-DD');
};

export const formatTimeOnly = (date: string | Date | number): string => {
  return formatDate(date, 'HH:mm:ss');
};

export const formatRelativeTime = (date: string | Date | number): string => {
  if (!date) return '-';
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');
  const diffHours = now.diff(target, 'hour');
  const diffDays = now.diff(target, 'day');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDateOnly(date);
};

export const formatCurrency = (
  amount: number,
  currency: string = 'CNY',
  decimals: number = 2
): string => {
  if (amount === null || amount === undefined) return '-';
  const symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const formatNumber = (
  num: number,
  decimals: number = 0,
  locale: string = 'zh-CN'
): string => {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatPercent = (
  value: number,
  decimals: number = 2,
  multiply: boolean = true
): string => {
  if (value === null || value === undefined) return '-';
  const num = multiply ? value * 100 : value;
  return `${num.toFixed(decimals)}%`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDuration = (hours: number): string => {
  if (hours === null || hours === undefined) return '-';
  if (hours < 1) {
    return `${Math.round(hours * 60)}分钟`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}小时`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)}天`;
};

export const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'amber' },
  processing: { label: '处理中', color: 'cyan' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'text-muted' },
  approved: { label: '已通过', color: 'green' },
  rejected: { label: '已拒绝', color: 'red' },
  escalated: { label: '已升级', color: 'amber' },
  declared: { label: '已申报', color: 'cyan' },
  inspecting: { label: '查验中', color: 'amber' },
  detained: { label: '已扣留', color: 'red' },
  cleared: { label: '已放行', color: 'green' },
  'in-transit': { label: '运输中', color: 'cyan' },
  delivered: { label: '已送达', color: 'green' },
  exception: { label: '异常', color: 'red' },
  low_stock: { label: '库存不足', color: 'red' },
  overstock: { label: '库存过剩', color: 'amber' },
  slow_moving: { label: '滞销', color: 'text-muted' },
};

export const getStatusLabel = (status: string): string => {
  return statusMap[status]?.label || status;
};

export const getStatusColor = (status: string): string => {
  return statusMap[status]?.color || 'text-muted';
};

export const roleMap: Record<string, string> = {
  consumer: '消费者',
  warehouse_manager: '仓库管理员',
  customs_officer: '清关专员',
  operation_director: '运营总监',
  admin: '系统管理员',
};

export const getRoleLabel = (role: string): string => {
  return roleMap[role] || role;
};

export const transportModeMap: Record<string, string> = {
  sea: '海运',
  air: '空运',
  rail: '铁路',
};

export const getTransportModeLabel = (mode: string): string => {
  return transportModeMap[mode] || mode;
};

export const regionMap: Record<string, string> = {
  US: '美国',
  EU: '欧洲',
  SoutheastAsia: '东南亚',
  China: '中国',
};

export const getRegionLabel = (region: string): string => {
  return regionMap[region] || region;
};

export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 7) return phone || '-';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

export const maskIdCard = (idCard: string): string => {
  if (!idCard || idCard.length < 8) return idCard || '-';
  return idCard.replace(/(\d{6})\d+(\d{4})/, '$1********$2');
};

export const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};
