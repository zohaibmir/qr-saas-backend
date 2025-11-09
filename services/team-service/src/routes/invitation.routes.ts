import { Router } from 'express';
import { InvitationController } from '../controllers/invitation.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function createInvitationRoutes(invitationController: InvitationController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authMiddleware);

  // Invitation management routes
  router.get('/', invitationController.getPendingInvitations.bind(invitationController));
  router.post('/:invitationId/accept', invitationController.acceptInvitation.bind(invitationController));
  router.post('/:invitationId/resend', invitationController.resendInvitation.bind(invitationController));
  router.delete('/:invitationId', invitationController.cancelInvitation.bind(invitationController));

  return router;
}