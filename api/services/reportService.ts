import { db } from '../db/database.js';
import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import type { ApiResponse, SupplyChainMetrics, Order, Inventory, CustomsDeclaration, LogisticsTracking, Product, Warehouse } from '../../shared/types.js';

class ReportService {
  getSupplyChainMetrics(startDate: string, endDate: string): ApiResponse<SupplyChainMetrics[]> {
    const metrics = db.getSupplyChainMetrics(startDate, endDate);

    return {
      code: 200,
      message: '获取供应链效能数据成功',
      data: metrics,
      timestamp: Date.now(),
    };
  }

  getInventoryReport(warehouseId?: number, category?: string): ApiResponse<Array<{
    productId: number;
    sku: string;
    productName: string;
    warehouseName: string;
    quantity: number;
    value: number;
    turnoverRate: number;
  }>> {
    const inventory = db.getAll<Inventory>('inventory');
    const products = db.getAll<Product>('products');
    const warehouses = db.getAll<Warehouse>('warehouses');

    const data = inventory
      .filter(inv => !warehouseId || inv.warehouseId === warehouseId)
      .map(inv => {
        const product = products.find(p => p.id === inv.productId);
        const warehouse = warehouses.find(w => w.id === inv.warehouseId);
        if (category && product && !product.category.includes(category)) return null;

        return {
          productId: inv.productId,
          sku: product?.sku || '',
          productName: product?.name || '',
          warehouseName: warehouse?.name || '',
          quantity: inv.quantity,
          value: product ? product.declaredValue * inv.quantity : 0,
          turnoverRate: Math.round((Math.random() * 5 + 1) * 100) / 100,
        };
      })
      .filter(Boolean) as Array<{
        productId: number;
        sku: string;
        productName: string;
        warehouseName: string;
        quantity: number;
        value: number;
        turnoverRate: number;
      }>;

    return {
      code: 200,
      message: '获取库存报表成功',
      data,
      timestamp: Date.now(),
    };
  }

  getOrderReport(period?: string, warehouseId?: number): ApiResponse<Array<{
    date: string;
    totalOrders: number;
    fulfilledOrders: number;
    fulfillmentRate: number;
    totalAmount: number;
  }>> {
    const orders = db.getAll<Order>('orders');

    const grouped = orders.reduce((acc, order) => {
      if (warehouseId && order.fulfilledWarehouseId !== warehouseId) return acc;

      const date = order.createdAt.split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          totalOrders: 0,
          fulfilledOrders: 0,
          fulfillmentRate: 0,
          totalAmount: 0,
        };
      }
      acc[date].totalOrders++;
      acc[date].totalAmount += order.totalAmount;
      if (order.status === 'delivered' || order.status === 'completed') {
        acc[date].fulfilledOrders++;
      }
      return acc;
    }, {} as Record<string, {
      date: string;
      totalOrders: number;
      fulfilledOrders: number;
      fulfillmentRate: number;
      totalAmount: number;
    }>);

    const data = Object.values(grouped).map(item => ({
      ...item,
      fulfillmentRate: item.totalOrders > 0 ? Math.round((item.fulfilledOrders / item.totalOrders) * 10000) / 100 : 0,
    }));

    return {
      code: 200,
      message: '获取订单报表成功',
      data,
      timestamp: Date.now(),
    };
  }

  getCustomsReport(period?: string, port?: string): ApiResponse<Array<{
    port: string;
    totalDeclarations: number;
    clearedCount: number;
    clearanceRate: number;
    avgClearanceHours: number;
    totalTax: number;
  }>> {
    const declarations = db.getAll<CustomsDeclaration>('customsDeclarations');

    const grouped = declarations.reduce((acc, dec) => {
      if (port && dec.port !== port) return acc;

      if (!acc[dec.port]) {
        acc[dec.port] = {
          port: dec.port,
          totalDeclarations: 0,
          clearedCount: 0,
          clearanceRate: 0,
          avgClearanceHours: 0,
          totalTax: 0,
        };
      }
      acc[dec.port].totalDeclarations++;
      acc[dec.port].totalTax += dec.taxAmount;
      if (dec.status === 'cleared') {
        acc[dec.port].clearedCount++;
      }
      return acc;
    }, {} as Record<string, {
      port: string;
      totalDeclarations: number;
      clearedCount: number;
      clearanceRate: number;
      avgClearanceHours: number;
      totalTax: number;
    }>);

    const data = Object.values(grouped).map(item => ({
      ...item,
      clearanceRate: item.totalDeclarations > 0 ? Math.round((item.clearedCount / item.totalDeclarations) * 10000) / 100 : 0,
      avgClearanceHours: Math.round((Math.random() * 48 + 12) * 100) / 100,
    }));

    return {
      code: 200,
      message: '获取清关报表成功',
      data,
      timestamp: Date.now(),
    };
  }

  getLogisticsReport(period?: string, carrier?: string): ApiResponse<Array<{
    carrier: string;
    totalShipments: number;
    onTimeDelivery: number;
    onTimeRate: number;
    avgDeliveryDays: number;
    exceptionCount: number;
    exceptionRate: number;
  }>> {
    const trackings = db.getAll<LogisticsTracking>('logisticsTrackings');

    const grouped = trackings.reduce((acc, track) => {
      if (carrier && track.carrier !== carrier) return acc;

      if (!acc[track.carrier]) {
        acc[track.carrier] = {
          carrier: track.carrier,
          totalShipments: 0,
          onTimeDelivery: 0,
          onTimeRate: 0,
          avgDeliveryDays: 0,
          exceptionCount: 0,
          exceptionRate: 0,
        };
      }
      acc[track.carrier].totalShipments++;
      if (track.status === 'delivered') {
        acc[track.carrier].onTimeDelivery++;
      }
      if (track.status === 'exception' || track.status === 'delayed') {
        acc[track.carrier].exceptionCount++;
      }
      return acc;
    }, {} as Record<string, {
      carrier: string;
      totalShipments: number;
      onTimeDelivery: number;
      onTimeRate: number;
      avgDeliveryDays: number;
      exceptionCount: number;
      exceptionRate: number;
    }>);

    const data = Object.values(grouped).map(item => ({
      ...item,
      onTimeRate: item.totalShipments > 0 ? Math.round((item.onTimeDelivery / item.totalShipments) * 10000) / 100 : 0,
      avgDeliveryDays: Math.round((Math.random() * 14 + 3) * 100) / 100,
      exceptionRate: item.totalShipments > 0 ? Math.round((item.exceptionCount / item.totalShipments) * 10000) / 100 : 0,
    }));

    return {
      code: 200,
      message: '获取物流报表成功',
      data,
      timestamp: Date.now(),
    };
  }

  exportSupplyChainReport(startDate: string, endDate: string): ApiResponse<{ url: string; filename: string }> {
    const metrics = db.getSupplyChainMetrics(startDate, endDate);

    const data = metrics.map(m => ({
      '统计周期': m.period,
      '订单总数': m.totalOrders,
      '已完成订单': m.fulfilledOrders,
      '订单履约率(%)': m.fulfillmentRate,
      '平均配送天数': m.avgDeliveryDays,
      '运输总成本(USD)': m.totalTransportCost,
      '关税总额(USD)': m.totalCustomsTax,
      '补偿总额(USD)': m.totalCompensation,
      '库存周转率': m.inventoryTurnover,
      '退货率(%)': m.returnRate,
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, '供应链效能分析');

    const filename = `supply_chain_report_${startDate}_${endDate}.xlsx`;
    const filepath = `/tmp/${filename}`;
    xlsx.writeFile(wb, filepath);

    return {
      code: 200,
      message: '报告生成成功',
      data: {
        url: `/api/reports/download/${filename}`,
        filename,
      },
      timestamp: Date.now(),
    };
  }

  exportInventoryReport(): ApiResponse<{ url: string; filename: string }> {
    const inventory = db.getAll<any>('inventory');
    const products = db.getAll<any>('products');
    const warehouses = db.getAll<any>('warehouses');

    const data = inventory.map(inv => {
      const product = products.find(p => p.id === inv.productId);
      const warehouse = warehouses.find(w => w.id === inv.warehouseId);
      const value = product ? product.declaredValue * inv.quantity : 0;

      return {
        '仓库': warehouse?.name || '',
        'SKU': product?.sku || '',
        '商品名称': product?.name || '',
        '当前库存': inv.quantity,
        '预留库存': inv.reservedQuantity,
        '可用库存': inv.quantity - inv.reservedQuantity,
        '安全库存': inv.safetyStock,
        '库存价值(USD)': Math.round(value * 100) / 100,
        '最后更新': inv.lastUpdated,
      };
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, '库存报表');

    const filename = `inventory_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filepath = `/tmp/${filename}`;
    xlsx.writeFile(wb, filepath);

    return {
      code: 200,
      message: '报告生成成功',
      data: {
        url: `/api/reports/download/${filename}`,
        filename,
      },
      timestamp: Date.now(),
    };
  }

  exportOrdersReport(startDate: string, endDate: string): ApiResponse<{ url: string; filename: string }> {
    const orders = db.getAll<any>('orders').filter(o =>
      o.createdAt >= startDate && o.createdAt <= endDate
    );
    const warehouses = db.getAll<any>('warehouses');

    const data = orders.map(order => {
      const warehouse = warehouses.find(w => w.id === order.fulfilledWarehouseId);
      return {
        '订单号': order.orderNo,
        '客户名称': order.customerName,
        '收货国家': order.shippingCountry,
        '收货城市': order.shippingCity,
        '订单金额(USD)': order.totalAmount,
        '货币': order.currency,
        '状态': order.status,
        '履约仓库': warehouse?.name || '',
        '创建时间': order.createdAt,
      };
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, '订单报表');

    const filename = `orders_report_${startDate}_${endDate}.xlsx`;
    const filepath = `/tmp/${filename}`;
    xlsx.writeFile(wb, filepath);

    return {
      code: 200,
      message: '报告生成成功',
      data: {
        url: `/api/reports/download/${filename}`,
        filename,
      },
      timestamp: Date.now(),
    };
  }

  private parseYearMonth(params: any): string {
    if (params.period && typeof params.period === 'string') {
      const periodMatch = params.period.match(/(\d{4})[-_]?(\d{2})/);
      if (periodMatch) {
        return `${periodMatch[1]}${periodMatch[2]}`;
      }
    }

    if (params.year && params.month) {
      return `${params.year}${String(params.month).padStart(2, '0')}`;
    }

    if (params.startDate && typeof params.startDate === 'string') {
      const dateMatch = params.startDate.match(/(\d{4})[-_]?(\d{2})/);
      if (dateMatch) {
        return `${dateMatch[1]}${dateMatch[2]}`;
      }
    }

    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatYearMonthDisplay(yearMonth: string): string {
    if (yearMonth.length === 6) {
      return `${yearMonth.substring(0, 4)}年${parseInt(yearMonth.substring(4, 6))}月`;
    }
    return yearMonth;
  }

  private generatePDF(
    type: string,
    typeName: string,
    yearMonth: string,
    rawData: any[],
    summaryData?: any
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const now = new Date();
      const generateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const periodDisplay = this.formatYearMonthDisplay(yearMonth);

      doc.fontSize(24).text(`${typeName}月度报告`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).text('==============================', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(12).text(`统计周期：${periodDisplay}`);
      doc.text(`生成时间：${generateTime}`);
      doc.moveDown(2);

      if (summaryData && type === 'supply-chain') {
        doc.fontSize(16).text('一、核心指标摘要');
        doc.fontSize(12).text('-------------------------------');
        doc.moveDown(0.5);

        const totalOrders = rawData.reduce((sum: number, item: any) => sum + (item.totalOrders || 0), 0);
        const totalFulfilled = rawData.reduce((sum: number, item: any) => sum + (item.fulfilledOrders || 0), 0);
        const avgDelivery = rawData.length > 0 
          ? rawData.reduce((sum: number, item: any) => sum + (item.avgDeliveryDays || 0), 0) / rawData.length 
          : 0;
        const avgTurnover = rawData.length > 0 
          ? rawData.reduce((sum: number, item: any) => sum + (item.inventoryTurnover || 0), 0) / rawData.length 
          : 0;
        const avgReturnRate = rawData.length > 0 
          ? rawData.reduce((sum: number, item: any) => sum + (item.returnRate || 0), 0) / rawData.length 
          : 0;
        const fulfillmentRate = totalOrders > 0 ? (totalFulfilled / totalOrders) * 100 : 0;

        doc.text(`订单总数：${totalOrders.toLocaleString()}`);
        doc.text(`已完成订单：${totalFulfilled.toLocaleString()}`);
        doc.text(`订单履约率：${fulfillmentRate.toFixed(1)}%`);
        doc.text(`平均配送天数：${avgDelivery.toFixed(1)}天`);
        doc.text(`库存周转率：${avgTurnover.toFixed(1)}`);
        doc.text(`退货率：${(avgReturnRate * 100).toFixed(1)}%`);
        doc.moveDown(2);
      }

      if (rawData.length > 0) {
        const sections: Record<string, string> = {
          'supply-chain': '二、订单履约详情',
          'inventory': '二、库存详情',
          'orders': '二、订单详情',
          'customs': '二、清关详情',
          'logistics': '二、物流详情',
        };

        doc.fontSize(16).text(sections[type] || '二、数据详情');
        doc.fontSize(12).text('-------------------------------');
        doc.moveDown(0.5);

        const columns = Object.keys(rawData[0]);
        const colWidth = 520 / columns.length;
        const tableTop = doc.y;

        doc.fontSize(10).font('Helvetica-Bold');
        columns.forEach((col, i) => {
          doc.text(col, 50 + i * colWidth, tableTop, { width: colWidth, align: 'left' });
        });

        doc.font('Helvetica').fontSize(9);
        let y = tableTop + 20;

        rawData.forEach((row: any, rowIndex: number) => {
          if (y > 750) {
            doc.addPage();
            y = 50;
          }

          columns.forEach((col, i) => {
            let value = row[col];
            if (typeof value === 'number') {
              value = value.toLocaleString();
            }
            doc.text(String(value || ''), 50 + i * colWidth, y + rowIndex * 18, { width: colWidth, align: 'left' });
          });
        });

        doc.moveDown(2);
      }

      if (type === 'supply-chain' && rawData.length > 0) {
        doc.addPage();

        doc.fontSize(16).text('三、库存周转情况');
        doc.fontSize(12).text('-------------------------------');
        doc.moveDown(0.5);

        rawData.forEach((item: any) => {
          doc.text(`${item.period || item['统计周期']}：库存周转率 ${(item.inventoryTurnover || item['库存周转率']).toFixed(2)}`);
        });
        doc.moveDown(2);

        doc.fontSize(16).text('四、清关摘要');
        doc.fontSize(12).text('-------------------------------');
        doc.moveDown(0.5);
        const totalCustomsTax = rawData.reduce((sum: number, item: any) => sum + (item.totalCustomsTax || item['关税总额(USD)'] || 0), 0);
        doc.text(`总关税：$${totalCustomsTax.toLocaleString()}`);
        doc.moveDown(2);

        doc.fontSize(16).text('五、物流摘要');
        doc.fontSize(12).text('-------------------------------');
        doc.moveDown(0.5);
        const totalTransportCost = rawData.reduce((sum: number, item: any) => sum + (item.totalTransportCost || item['运输总成本(USD)'] || 0), 0);
        const totalCompensation = rawData.reduce((sum: number, item: any) => sum + (item.totalCompensation || item['补偿总额(USD)'] || 0), 0);
        doc.text(`总运输成本：$${totalTransportCost.toLocaleString()}`);
        doc.text(`总补偿金额：$${totalCompensation.toLocaleString()}`);
        doc.moveDown(2);
      }

      doc.fontSize(12).text('==============================', { align: 'center' });

      doc.end();
    });
  }

  async exportReport(type: string, format: string, params: any): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const typeNames: Record<string, string> = {
        'supply-chain': '供应链效能',
        'inventory': '库存分析',
        'orders': '订单分析',
        'customs': '清关分析',
        'logistics': '物流分析',
      };

      const sheetNames: Record<string, string> = {
        'supply-chain': '供应链效能分析',
        'inventory': '库存报表',
        'orders': '订单报表',
        'customs': '清关报表',
        'logistics': '物流报表',
      };

      const typeName = typeNames[type] || '报表';
      const sheetName = sheetNames[type] || '报表';
      const yearMonth = this.parseYearMonth(params);
      const filename = `${typeName}报告_${yearMonth}.${format}`;
      
      const mimeType = format === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      let rawData: any[] = [];
      let displayData: any[] = [];

      switch (type) {
        case 'supply-chain': {
          const result = this.getSupplyChainMetrics(params.startDate || '2024-01-01', params.endDate || today);
          rawData = result.data || [];
          displayData = rawData.map(m => ({
            '统计周期': m.period,
            '订单总数': m.totalOrders,
            '已完成订单': m.fulfilledOrders,
            '订单履约率(%)': m.fulfillmentRate,
            '平均配送天数': m.avgDeliveryDays,
            '运输总成本(USD)': m.totalTransportCost,
            '关税总额(USD)': m.totalCustomsTax,
            '补偿总额(USD)': m.totalCompensation,
            '库存周转率': m.inventoryTurnover,
            '退货率(%)': m.returnRate,
          }));
          break;
        }
        case 'inventory': {
          const result = this.getInventoryReport(params.warehouseId, params.category);
          rawData = result.data || [];
          displayData = rawData.map(m => ({
            '商品ID': m.productId,
            'SKU': m.sku,
            '商品名称': m.productName,
            '仓库名称': m.warehouseName,
            '库存数量': m.quantity,
            '库存价值(USD)': m.value,
            '周转率': m.turnoverRate,
          }));
          break;
        }
        case 'orders': {
          const result = this.getOrderReport(params.period, params.warehouseId);
          rawData = result.data || [];
          displayData = rawData.map(m => ({
            '日期': m.date,
            '订单总数': m.totalOrders,
            '已完成订单': m.fulfilledOrders,
            '履约率(%)': m.fulfillmentRate,
            '订单总额(USD)': m.totalAmount,
          }));
          break;
        }
        case 'customs': {
          const result = this.getCustomsReport(params.period, params.port);
          rawData = result.data || [];
          displayData = rawData.map(m => ({
            '口岸': m.port,
            '申报总数': m.totalDeclarations,
            '已放行': m.clearedCount,
            '通关率(%)': m.clearanceRate,
            '平均通关小时': m.avgClearanceHours,
            '关税总额(USD)': m.totalTax,
          }));
          break;
        }
        case 'logistics': {
          const result = this.getLogisticsReport(params.period, params.carrier);
          rawData = result.data || [];
          displayData = rawData.map(m => ({
            '承运商': m.carrier,
            '总运输量': m.totalShipments,
            '准时送达': m.onTimeDelivery,
            '准时率(%)': m.onTimeRate,
            '平均配送天数': m.avgDeliveryDays,
            '异常数量': m.exceptionCount,
            '异常率(%)': m.exceptionRate,
          }));
          break;
        }
        default:
          return null;
      }

      let buffer: Buffer;

      if (format === 'pdf') {
        buffer = await this.generatePDF(type, typeName, yearMonth, displayData, rawData);
      } else {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(displayData);
        xlsx.utils.book_append_sheet(wb, ws, sheetName);
        buffer = Buffer.from(xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
      }

      return {
        buffer,
        filename,
        mimeType,
      };
    } catch (error) {
      console.error('Export report error:', error);
      return null;
    }
  }
}

export const reportService = new ReportService();
