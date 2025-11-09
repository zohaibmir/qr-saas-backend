// Temporary script to fix error handling in team service
const fs = require('fs');

const filePath = '/private/var/www/qrgeneration/services/team-service/src/services/team.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all generic Error instances with AppError
const replacements = [
  {
    search: "return { success: false, error: new Error('Failed to retrieve organization') };",
    replace: "return { success: false, error: new AppError('Failed to retrieve organization', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to update organization') };",
    replace: "return { success: false, error: new AppError('Failed to update organization', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to delete organization') };",
    replace: "return { success: false, error: new AppError('Failed to delete organization', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to retrieve organizations') };",
    replace: "return { success: false, error: new AppError('Failed to retrieve organizations', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to send invitation') };",
    replace: "return { success: false, error: new AppError('Failed to send invitation', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to retrieve members') };",
    replace: "return { success: false, error: new AppError('Failed to retrieve members', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to update member role') };",
    replace: "return { success: false, error: new AppError('Failed to update member role', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to remove member') };",
    replace: "return { success: false, error: new AppError('Failed to remove member', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to accept invitation') };",
    replace: "return { success: false, error: new AppError('Failed to accept invitation', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to retrieve invitations') };",
    replace: "return { success: false, error: new AppError('Failed to retrieve invitations', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to cancel invitation') };",
    replace: "return { success: false, error: new AppError('Failed to cancel invitation', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to resend invitation') };",
    replace: "return { success: false, error: new AppError('Failed to resend invitation', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to check permission') };",
    replace: "return { success: false, error: new AppError('Failed to check permission', 500, 'INTERNAL_ERROR') };"
  },
  {
    search: "return { success: false, error: new Error('Failed to get user role') };",
    replace: "return { success: false, error: new AppError('Failed to get user role', 500, 'INTERNAL_ERROR') };"
  }
];

replacements.forEach(({ search, replace }) => {
  content = content.replace(search, replace);
});

fs.writeFileSync(filePath, content);
console.log('Fixed error handling in team service');