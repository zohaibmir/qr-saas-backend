import { Router } from 'express';
import { CustomDashboardController, dashboardValidation } from '../controllers/custom-dashboard.controller';
import { requireAuth, requireSubscriptionTier } from '../middleware/auth.middleware';
import { IDependencyContainer } from '../interfaces';

/**
 * Custom Dashboard Routes
 * 
 * Custom dashboards are premium features with subscription requirements:
 * - Starter: Basic dashboards (up to 3)
 * - Pro: Advanced dashboards (up to 10) + templates
 * - Business: Advanced dashboards (up to 25) + team features  
 * - Enterprise: Unlimited dashboards + custom widgets + real-time updates
 */
export function createCustomDashboardRoutes(container: IDependencyContainer): Router {
  const router = Router();
  const controller = new CustomDashboardController(container);

  // All dashboard operations require authentication
  router.use(requireAuth);

  // Basic Dashboard CRUD Operations (Starter tier and above)
  router.post('/', 
    requireSubscriptionTier('starter'),
    dashboardValidation.create, 
    controller.createDashboard
  );

  router.get('/', 
    requireSubscriptionTier('starter'),
    dashboardValidation.list, 
    controller.getUserDashboards
  );

  router.get('/:id', 
    requireSubscriptionTier('starter'),
    dashboardValidation.get, 
    controller.getDashboard
  );

  router.put('/:id', 
    requireSubscriptionTier('starter'),
    dashboardValidation.update, 
    controller.updateDashboard
  );

  router.delete('/:id', 
    requireSubscriptionTier('starter'),
    dashboardValidation.get, 
    controller.deleteDashboard
  );

  // Dashboard Templates (Pro tier and above)
  router.get('/templates', 
    requireSubscriptionTier('pro'),
    controller.getDashboardTemplates
  );

  router.post('/templates/:templateId/create', 
    requireSubscriptionTier('pro'),
    controller.createFromTemplate
  );

  // Advanced Widget Operations (Pro tier and above)
  router.get('/widgets/:widgetId/data', 
    requireSubscriptionTier('pro'),
    controller.getWidgetData
  );

  router.get('/widget-templates', 
    requireSubscriptionTier('pro'),
    controller.getWidgetTemplates
  );

  // Premium Dashboard Features (Enterprise tier)
  router.post('/:id/duplicate', 
    requireSubscriptionTier('enterprise'),
    controller.duplicateDashboard
  );

  router.get('/:id/export', 
    requireSubscriptionTier('enterprise'),
    controller.exportDashboard
  );

  router.get('/:id/analytics', 
    requireSubscriptionTier('enterprise'),
    controller.getDashboardAnalytics
  );

  return router;
}

/**
 * WebSocket setup for real-time dashboard updates
 */
export function setupDashboardWebSocket(io: any, container: IDependencyContainer): any {
  const dashboardNamespace = io.of('/dashboards');

  dashboardNamespace.on('connection', (socket: any) => {
    console.log('Dashboard client connected:', socket.id);

    // Join dashboard room for real-time updates
    socket.on('join-dashboard', (dashboardId: string) => {
      socket.join(`dashboard-${dashboardId}`);
      console.log(`Client ${socket.id} joined dashboard ${dashboardId}`);
    });

    // Leave dashboard room
    socket.on('leave-dashboard', (dashboardId: string) => {
      socket.leave(`dashboard-${dashboardId}`);
      console.log(`Client ${socket.id} left dashboard ${dashboardId}`);
    });

    // Request widget data refresh
    socket.on('refresh-widget', async (data: { widgetId: string; dashboardId: string }) => {
      try {
        // Emit refresh event to all clients in the dashboard room
        dashboardNamespace.to(`dashboard-${data.dashboardId}`).emit('widget-refresh', {
          widgetId: data.widgetId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to refresh widget:', error);
        socket.emit('error', { message: 'Failed to refresh widget data' });
      }
    });

    // Handle widget data updates
    socket.on('widget-data-update', (data: { widgetId: string; dashboardId: string; data: any }) => {
      // Broadcast updated data to all clients in the dashboard room
      socket.to(`dashboard-${data.dashboardId}`).emit('widget-data', {
        widgetId: data.widgetId,
        data: data.data,
        timestamp: new Date().toISOString()
      });
    });

    // Handle dashboard layout changes
    socket.on('dashboard-layout-change', (data: { dashboardId: string; layout: any }) => {
      // Broadcast layout changes to other clients
      socket.to(`dashboard-${data.dashboardId}`).emit('layout-changed', {
        layout: data.layout,
        timestamp: new Date().toISOString(),
        changedBy: socket.id
      });
    });

    // Handle real-time alerts
    socket.on('subscribe-alerts', (dashboardId: string) => {
      socket.join(`alerts-${dashboardId}`);
      console.log(`Client ${socket.id} subscribed to alerts for dashboard ${dashboardId}`);
    });

    socket.on('disconnect', () => {
      console.log('Dashboard client disconnected:', socket.id);
    });
  });

  // Utility functions for broadcasting
  return {
    broadcastWidgetData: (dashboardId: string, widgetId: string, data: any) => {
      dashboardNamespace.to(`dashboard-${dashboardId}`).emit('widget-data', {
        widgetId,
        data,
        timestamp: new Date().toISOString()
      });
    },
    broadcastAlert: (dashboardId: string, alert: any) => {
      dashboardNamespace.to(`alerts-${dashboardId}`).emit('dashboard-alert', {
        ...alert,
        timestamp: new Date().toISOString()
      });
    }
  };
}