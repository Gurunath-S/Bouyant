import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

router.use(authenticateToken);

router.get(
  '/overview',
  requirePermission(
    Permissions.REPORT_VIEW_PLATFORM,
    Permissions.REPORT_VIEW_EVENT,
    Permissions.REPORT_VIEW_OPERATIONAL
  ),
  asyncHandler(ReportsController.getOverview)
);

router.get(
  '/exhibitions',
  requirePermission(
    Permissions.REPORT_VIEW_PLATFORM,
    Permissions.REPORT_VIEW_EVENT,
    Permissions.REPORT_VIEW_OPERATIONAL
  ),
  asyncHandler(ReportsController.getExhibitions)
);

router.get(
  '/occupancy',
  requirePermission(
    Permissions.REPORT_VIEW_PLATFORM,
    Permissions.REPORT_VIEW_EVENT,
    Permissions.REPORT_VIEW_OPERATIONAL
  ),
  asyncHandler(ReportsController.getStallOccupancy)
);

export const reportRoutes = router;
