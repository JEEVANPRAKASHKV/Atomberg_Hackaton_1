import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://nqwvepnoadbfwrvkcjqh.supabase.co";

interface Employee {
  id: string;
  email: string;
  full_name: string;
  email_notifications_enabled?: boolean;
}

const getAppUrl = () => {
  return typeof window !== 'undefined' ? window.location.origin : 'https://atomberg.com';
};

// Email template wrapper with Atomberg branding
const emailTemplate = (content: string) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AtombergHR</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🏢 AtombergHR</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">This is an automated email from Atomberg HR Management System.</p>
              <p style="margin: 10px 0 0; color: #71717a; font-size: 12px;">© ${new Date().getFullYear()} Atomberg. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Core email sending function via Brevo
const sendEmail = async (to: string, subject: string, htmlContent: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session - cannot send email');
      return false;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email-brevo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ to, subject, htmlContent }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Email send failed:', error);
      return false;
    }

    console.log('Email sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

const getEmployeeEmailPreference = async (employeeId: string): Promise<Employee | null> => {
  const { data, error } = await supabase
    .from('hr_employees')
    .select('id, email, full_name, email_notifications_enabled')
    .eq('id', employeeId)
    .single();

  if (error || !data) {
    console.error('Error fetching employee email preference:', error);
    return null;
  }

  return data;
};

// Helper to format dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// 1. WELCOME EMAIL - New Employee
export const sendWelcomeEmail = async (
  employeeEmail: string,
  employeeName: string,
  employeeCode: string,
  password: string
) => {
  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Welcome to Atomberg! 🎉</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employeeName},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">We are thrilled to welcome you to the Atomberg family! Your account has been successfully created.</p>
    
    <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px; color: #18181b; font-size: 16px;">🔐 Your Login Credentials</h3>
      <p style="margin: 0 0 8px; color: #3f3f46;"><strong>Email:</strong> ${employeeEmail}</p>
      <p style="margin: 0 0 8px; color: #3f3f46;"><strong>Employee Code:</strong> ${employeeCode}</p>
      <p style="margin: 0; color: #3f3f46;"><strong>Temporary Password:</strong> ${password}</p>
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Please login to the HRMS portal using the button below:</p>
    <a href="${getAppUrl()}/auth" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Login to HRMS</a>
    
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>Important:</strong> For security reasons, please change your password after your first login.</p>
    </div>
    
    <p style="margin: 20px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employeeEmail, '🎉 Welcome to Atomberg - Your Account Details', emailTemplate(content));
};

// 2. LEAVE APPLIED - To Manager
export const sendLeaveAppliedEmail = async (
  managerEmail: string,
  managerName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string
) => {
  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">New Leave Request 📅</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${managerName},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;"><strong>${employeeName}</strong> has submitted a leave request that requires your approval.</p>
    
    <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0 0 8px; color: #3f3f46;"><strong>Leave Type:</strong> ${leaveType}</p>
      <p style="margin: 0 0 8px; color: #3f3f46;"><strong>Start Date:</strong> ${startDate}</p>
      <p style="margin: 0 0 8px; color: #3f3f46;"><strong>End Date:</strong> ${endDate}</p>
      <p style="margin: 0; color: #3f3f46;"><strong>Reason:</strong> ${reason || 'Not specified'}</p>
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Please review and approve/reject this request at your earliest convenience.</p>
    <a href="${getAppUrl()}/app/approvals" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Leave Request</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR</strong></p>
  `;

  return sendEmail(managerEmail, `🔔 Leave Request from ${employeeName}`, emailTemplate(content));
};

// 3. LEAVE APPROVED - To Employee
export const sendLeaveApprovedEmail = async (
  employeeId: string,
  managerName: string,
  leaveType: string,
  startDate: string,
  endDate: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Leave Request Approved ✅</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">Great news! Your leave request has been approved.</p>
    
    <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #22c55e;">
      <p style="margin: 0 0 8px; color: #166534;"><strong>Leave Type:</strong> ${leaveType}</p>
      <p style="margin: 0 0 8px; color: #166534;"><strong>Start Date:</strong> ${startDate}</p>
      <p style="margin: 0 0 8px; color: #166534;"><strong>End Date:</strong> ${endDate}</p>
      <p style="margin: 0; color: #166534;"><strong>Approved By:</strong> ${managerName}</p>
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">We hope you have a great time off!</p>
    <a href="${getAppUrl()}/app/leaves" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View My Leaves</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employee.email, '✅ Your Leave Request has been Approved', emailTemplate(content));
};

// 4. LEAVE REJECTED - To Employee
export const sendLeaveRejectedEmail = async (
  employeeId: string,
  managerName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  rejectionReason?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Leave Request Not Approved ❌</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">We regret to inform you that your leave request has not been approved.</p>
    
    <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0 0 8px; color: #991b1b;"><strong>Leave Type:</strong> ${leaveType}</p>
      <p style="margin: 0 0 8px; color: #991b1b;"><strong>Start Date:</strong> ${startDate}</p>
      <p style="margin: 0 0 8px; color: #991b1b;"><strong>End Date:</strong> ${endDate}</p>
      <p style="margin: 0 0 8px; color: #991b1b;"><strong>Rejected By:</strong> ${managerName}</p>
      ${rejectionReason ? `<p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">If you have any questions, please contact your manager or HR team.</p>
    <a href="${getAppUrl()}/app/leaves" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View My Leaves</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employee.email, '❌ Leave Request Status Update', emailTemplate(content));
};

// Combined function for leave approval emails (for backward compatibility)
export const sendLeaveApprovalEmail = async (
  employeeId: string,
  managerName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  approved: boolean,
  rejectionReason?: string
) => {
  if (approved) {
    return sendLeaveApprovedEmail(employeeId, managerName, leaveType, startDate, endDate);
  } else {
    return sendLeaveRejectedEmail(employeeId, managerName, leaveType, startDate, endDate, rejectionReason);
  }
};

// 5. REGULARIZATION APPLIED - To Manager
export const sendRegularizationAppliedEmail = async (
  managerEmail: string,
  managerName: string,
  employeeName: string,
  date: string,
  reason: string
) => {
  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">New Attendance Regularization Request 📝</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${managerName},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;"><strong>${employeeName}</strong> has submitted an attendance regularization request.</p>
    
    <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0 0 8px; color: #3f3f46;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 0; color: #3f3f46;"><strong>Reason:</strong> ${reason}</p>
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Please review and approve/reject this request.</p>
    <a href="${getAppUrl()}/app/regularization-admin" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Request</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR</strong></p>
  `;

  return sendEmail(managerEmail, `🔔 Attendance Regularization Request from ${employeeName}`, emailTemplate(content));
};

// 6. REGULARIZATION APPROVED - To Employee
export const sendRegularizationApprovedEmail = async (
  employeeId: string,
  date: string,
  approvedBy: string,
  oldStatus?: string,
  newStatus?: string,
  adminNotes?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Attendance Regularization Approved ✅</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">Your attendance regularization request has been approved.</p>
    
    <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #22c55e;">
      <p style="margin: 0 0 8px; color: #166534;"><strong>Date:</strong> ${date}</p>
      ${oldStatus && newStatus ? `<p style="margin: 0 0 8px; color: #166534;"><strong>Status Change:</strong> ${oldStatus} → ${newStatus}</p>` : ''}
      <p style="margin: 0 0 8px; color: #166534;"><strong>Approved By:</strong> ${approvedBy}</p>
      ${adminNotes ? `<p style="margin: 0; color: #166534;"><strong>Notes:</strong> ${adminNotes}</p>` : ''}
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Your attendance has been updated accordingly.</p>
    <a href="${getAppUrl()}/app/attendance" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Attendance</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employee.email, '✅ Attendance Regularization Approved', emailTemplate(content));
};

// 7. REGULARIZATION REJECTED - To Employee
export const sendRegularizationRejectedEmail = async (
  employeeId: string,
  date: string,
  rejectedBy: string,
  reason?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Attendance Regularization Not Approved ❌</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">Your attendance regularization request has not been approved.</p>
    
    <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0 0 8px; color: #991b1b;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 0 0 8px; color: #991b1b;"><strong>Rejected By:</strong> ${rejectedBy}</p>
      ${reason ? `<p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>` : ''}
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">If you have any questions, please contact your manager.</p>
    <a href="${getAppUrl()}/app/attendance" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Attendance</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employee.email, '❌ Attendance Regularization Status Update', emailTemplate(content));
};

// Legacy function for backward compatibility
export const sendRegularizationEmail = async (
  employeeId: string,
  date: string,
  oldStatus: string,
  newStatus: string,
  adminNotes?: string
) => {
  return sendRegularizationApprovedEmail(employeeId, date, 'HR Admin', oldStatus, newStatus, adminNotes);
};

// 8. WORK LOG APPROVED - To Employee
export const sendWorkLogApprovedEmail = async (
  employeeId: string,
  date: string,
  approvedBy: string,
  comment?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Work Log Approved ✅</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">Your work log has been reviewed and approved.</p>
    
    <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #22c55e;">
      <p style="margin: 0 0 8px; color: #166534;"><strong>Date/Week:</strong> ${date}</p>
      <p style="margin: 0 0 8px; color: #166534;"><strong>Approved By:</strong> ${approvedBy}</p>
      ${comment ? `<p style="margin: 0; color: #166534;"><strong>Comment:</strong> ${comment}</p>` : ''}
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Great work! Keep up the excellent performance.</p>
    <a href="${getAppUrl()}/app/work-log" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Work Logs</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employee.email, '✅ Your Work Log has been Approved', emailTemplate(content));
};

// 9. WORK LOG REWORK - To Employee
export const sendWorkLogReworkEmail = async (
  employeeId: string,
  date: string,
  reviewedBy: string,
  feedback: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Work Log Requires Rework 🔄</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">Your work log has been reviewed and requires some updates.</p>
    
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 8px; color: #92400e;"><strong>Date/Week:</strong> ${date}</p>
      <p style="margin: 0 0 8px; color: #92400e;"><strong>Reviewed By:</strong> ${reviewedBy}</p>
      <p style="margin: 0; color: #92400e;"><strong>Feedback:</strong> ${feedback}</p>
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Please review the feedback and update your work log accordingly.</p>
    <a href="${getAppUrl()}/app/work-log" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Update Work Log</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employee.email, '🔄 Work Log Update Required', emailTemplate(content));
};

// Legacy function for backward compatibility
export const sendWorkLogEmail = async (
  employeeId: string,
  managerName: string,
  weekRange: string,
  approved: boolean,
  comment?: string
) => {
  if (approved) {
    return sendWorkLogApprovedEmail(employeeId, weekRange, managerName, comment);
  } else {
    return sendWorkLogReworkEmail(employeeId, weekRange, managerName, comment || 'Please review your work log and make necessary changes.');
  }
};

// 10. APPRECIATION RECEIVED - To Employee
export const sendAppreciationEmail = async (
  toEmployeeId: string,
  senderName: string,
  tag: string,
  message: string
) => {
  const employee = await getEmployeeEmailPreference(toEmployeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">You've Received an Appreciation! ❤️</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;"><strong>${senderName}</strong> has appreciated you!</p>
    
    <div style="background-color: #fce7f3; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ec4899;">
      <p style="margin: 0 0 8px; color: #9d174d;"><strong>Tag:</strong> ${tag}</p>
      <p style="margin: 0 0 15px; color: #9d174d;"><strong>Message:</strong></p>
      <p style="margin: 0; color: #831843; font-style: italic; font-size: 16px;">"${message}"</p>
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Keep up the amazing work! 🌟</p>
    <a href="${getAppUrl()}/app/appreciations?tab=received" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View All Appreciations</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employee.email, `❤️ You received an appreciation from ${senderName}!`, emailTemplate(content));
};

// 11. NEW ANNOUNCEMENT - To Employees
export const sendAnnouncementEmail = async (
  employeeId: string,
  title: string,
  content: string,
  priority?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const priorityEmoji = priority === 'High' ? '🔴' : priority === 'Medium' ? '🟡' : '🟢';
  
  const emailContent = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">New Announcement ${priorityEmoji}</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">A new announcement has been posted:</p>
    
    <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px; color: #18181b; font-size: 18px;">${title}</h3>
      <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">${content}</p>
      ${priority ? `<p style="margin: 0; color: #71717a; font-size: 14px;"><strong>Priority:</strong> ${priority}</p>` : ''}
    </div>
    
    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Check the HRMS portal for more details.</p>
    <a href="${getAppUrl()}/app/announcements" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Announcement</a>
    
    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;

  return sendEmail(employee.email, `📢 New Announcement: ${title}`, emailTemplate(emailContent));
};

// ============================================================
// GOAL MODULE EMAIL TRIGGERS
// ============================================================

// 12. GOAL SUBMITTED - Notify Manager
export const sendGoalSubmissionEmail = async (
  managerEmail: string,
  managerName: string,
  employeeName: string,
  cycleName: string
) => {
  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Goal Sheet Submitted for Review 🎯</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${managerName},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;"><strong>${employeeName}</strong> has submitted their goal sheet for <strong>${cycleName}</strong> and is awaiting your approval.</p>

    <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 8px; color: #1e40af;"><strong>Employee:</strong> ${employeeName}</p>
      <p style="margin: 0; color: #1e40af;"><strong>Cycle:</strong> ${cycleName}</p>
    </div>

    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Please review the goal sheet at your earliest convenience. You can approve it or return it for rework with your comments.</p>
    <a href="${getAppUrl()}/app/manager/goal-approvals" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Goal Sheet</a>

    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;
  return sendEmail(managerEmail, `🎯 Goal Sheet Submitted by ${employeeName} — ${cycleName}`, emailTemplate(content));
};

// 13. GOAL APPROVED - Notify Employee
export const sendGoalApprovalEmail = async (
  employeeId: string,
  managerName: string,
  cycleName: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Your Goal Sheet has been Approved ✅</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">Great news! Your goal sheet for <strong>${cycleName}</strong> has been reviewed and approved by <strong>${managerName}</strong>.</p>

    <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #22c55e;">
      <p style="margin: 0 0 8px; color: #166534;"><strong>Cycle:</strong> ${cycleName}</p>
      <p style="margin: 0; color: #166534;"><strong>Approved By:</strong> ${managerName}</p>
    </div>

    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Your goals are now <strong>locked</strong>. You can begin entering your quarterly check-in progress once the respective windows open.</p>
    <a href="${getAppUrl()}/app/goals" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View My Goals</a>

    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;
  return sendEmail(employee.email, `✅ Goal Sheet Approved — ${cycleName}`, emailTemplate(content));
};

// 14. GOAL RETURNED FOR REWORK - Notify Employee
export const sendGoalReworkEmail = async (
  employeeId: string,
  managerName: string,
  cycleName: string,
  reworkComment: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">Goal Sheet Returned for Rework 🔄</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">Your goal sheet for <strong>${cycleName}</strong> has been reviewed by <strong>${managerName}</strong> and returned for revision.</p>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 8px; color: #92400e;"><strong>Reviewed By:</strong> ${managerName}</p>
      <p style="margin: 0 0 8px; color: #92400e;"><strong>Cycle:</strong> ${cycleName}</p>
      <p style="margin: 0; color: #92400e;"><strong>Manager's Comment:</strong> ${reworkComment}</p>
    </div>

    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Please revise your goals based on the feedback above and resubmit for approval.</p>
    <a href="${getAppUrl()}/app/goals/create" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Revise Goal Sheet</a>

    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;
  return sendEmail(employee.email, `🔄 Goal Sheet Returned for Rework — ${cycleName}`, emailTemplate(content));
};

// 15. QUARTERLY CHECK-IN REMINDER - Notify Employee
export const sendCheckinReminderEmail = async (
  employeeId: string,
  quarter: string,
  cycleName: string,
  deadlineDate?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">${quarter} Check-In Window is Now Open 📋</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;">The <strong>${quarter}</strong> goal check-in window for <strong>${cycleName}</strong> is now open. Please log your actual achievements against your planned targets.</p>

    <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 8px; color: #1e40af;"><strong>Quarter:</strong> ${quarter}</p>
      <p style="margin: 0 0 8px; color: #1e40af;"><strong>Cycle:</strong> ${cycleName}</p>
      ${deadlineDate ? `<p style="margin: 0; color: #1e40af;"><strong>Window Closes:</strong> ${deadlineDate}</p>` : ''}
    </div>

    <p style="margin: 0 0 25px; color: #3f3f46; line-height: 1.6;">Please update your check-in status: Not Started / On Track / Completed — and enter your actual values to keep your progress on track.</p>
    <a href="${getAppUrl()}/app/goals/checkin" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Submit Check-In</a>

    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;
  return sendEmail(employee.email, `📋 ${quarter} Check-In Window Open — ${cycleName}`, emailTemplate(content));
};

// 16. SHARED GOAL RECEIVED - Notify Employee
export const sendSharedGoalEmail = async (
  employeeId: string,
  pushedByName: string,
  goalTitle: string,
  cycleName: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return false;

  const content = `
    <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px;">A Shared Goal has been Added to Your Sheet 🔗</h2>
    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Dear ${employee.full_name},</p>
    <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.6;"><strong>${pushedByName}</strong> has pushed a departmental/shared goal to your goal sheet for <strong>${cycleName}</strong>.</p>

    <div style="background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #8b5cf6;">
      <p style="margin: 0 0 8px; color: #5b21b6;"><strong>Goal Title:</strong> ${goalTitle}</p>
      <p style="margin: 0 0 8px; color: #5b21b6;"><strong>Pushed By:</strong> ${pushedByName}</p>
      <p style="margin: 0; color: #5b21b6;"><strong>Cycle:</strong> ${cycleName}</p>
    </div>

    <p style="margin: 0 0 15px; color: #3f3f46; line-height: 1.6;">Please note: The goal title and target are <strong>read-only</strong>. You may only adjust the weightage allocated to this goal in your goal sheet.</p>
    <a href="${getAppUrl()}/app/goals/create" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View My Goal Sheet</a>

    <p style="margin: 25px 0 0; color: #3f3f46; line-height: 1.6;">Best regards,<br><strong>AtombergHR Team</strong></p>
  `;
  return sendEmail(employee.email, `🔗 Shared Goal Added — ${goalTitle}`, emailTemplate(content));
};
