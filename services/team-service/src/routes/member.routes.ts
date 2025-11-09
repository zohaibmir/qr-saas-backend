import { Router } from 'express';
import { MemberController } from '../controllers/member.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function createMemberRoutes(memberController: MemberController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authMiddleware);

  // Member management routes
  router.post('/:organizationId/invite', memberController.inviteMember.bind(memberController));
  router.get('/:organizationId', memberController.getMembers.bind(memberController));
  router.put('/:organizationId/:memberId', memberController.updateMemberRole.bind(memberController));
  router.delete('/:organizationId/:memberId', memberController.removeMember.bind(memberController));

  return router;
}